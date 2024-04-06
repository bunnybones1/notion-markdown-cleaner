const fs = require("fs");
const markdownLinkExtractor = require("markdown-link-extractor");
const path = require("path");

// Function to clean a string based on specified rules
function cleanString(input) {
  // Remove 32-character length hash (assuming it's a sequence of hexadecimal characters)
  let cleaned = input.replace(/[a-fA-F0-9]{32}/g, "");

  // Replace URL percent encoded characters (%xx) with dashes
  cleaned = cleaned.replace(/%[0-9a-fA-F]{2}/g, "-");

  // Replace characters other than alphanumeric, dash, period, and forward slash with dashes
  cleaned = cleaned.replace(/[^a-zA-Z0-9.\/-]/g, "-");

  // Squeeze consecutive dashes into a single dash
  cleaned = cleaned.replace(/-+/g, "-");

  // Remove leading and trailing dashes
  cleaned = cleaned.replace(/^-+|-+$/g, "");

  // Remove dashes adjacent to forward slash (/) or period (.)
  cleaned = cleaned.replaceAll("-/", "/");
  cleaned = cleaned.replaceAll("-.", ".");

  return cleaned;
}

// Function to process individual Markdown file
function processMarkdownFile(filePath) {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(`Error reading file: ${filePath}`);
      return;
    }

    const links = markdownLinkExtractor(data).filter(
      (link) => !link.includes("://")
    );

    let modifiedContent = data;

    for (const link of links) {
      const cleanedLink = cleanString(link);
      modifiedContent = modifiedContent.replaceAll(link, cleanedLink);
    }

    // Write the modified content back to the file
    fs.writeFile(filePath, modifiedContent, "utf8", (err) => {
      if (err) {
        console.error(`Error writing file: ${filePath}`);
      } else {
        console.log(`Processed: ${filePath}`);
      }
    });
  });
}

// Function to process Markdown files recursively in the specified directory
function renameFilesAndFolders(directory) {
  // Function to recursively iterate over files and folders
  function iterateFilesAndFolders(directory) {
    // Read contents of the directory
    for (const item of fs.readdirSync(directory)) {
      const itemPath = path.join(directory, item);
      if (itemPath.includes("node_modules") || item.startsWith(".")) {
        continue
      }
      const newItemPath = cleanString(itemPath);
      if (itemPath !== newItemPath) {
        console.log("renaming", itemPath, newItemPath);
        fs.renameSync(itemPath, newItemPath);
        return true;
      }

      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        // If item is a directory, recursively iterate
        if (iterateFilesAndFolders(itemPath)) {
          return true;
        }
      } else if (stats.isFile()) {
        // If item is a file, check if it matches the pattern
        // if (item.match(pattern)) {
        //     console.log(`Found matching file: ${itemPath}`);
        //     process.exit(0); // Exit after first match
        // }
      }
    }
  }
  let keepGoing = true;
  while (keepGoing) {
    keepGoing = iterateFilesAndFolders(directory);
  }
}

// Function to process Markdown files recursively in the specified directory
function processMarkdownFiles(directory) {
  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error(`Error reading directory: ${directory}`);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(directory, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error checking file stats: ${filePath}`);
          return;
        }

        if (stats.isDirectory()) {
          // Recursively process subdirectories
          processMarkdownFiles(filePath);
        } else if (stats.isFile() && file.endsWith(".md")) {
          // Process Markdown files
          processMarkdownFile(filePath);
        }
      });
    });
  });
}

// Main script starts here
if (process.argv.length !== 3) {
  console.error("Usage: node markdownProcessor.js <directory>");
  process.exit(1);
}

const directory = process.argv[2];

// Check if the specified directory exists
fs.stat(directory, (err, stats) => {
  if (err || !stats.isDirectory()) {
    console.error(`Error: Directory '${directory}' not found.`);
    process.exit(1);
  }

  renameFilesAndFolders(directory);

  // Process Markdown files recursively in the specified directory
  processMarkdownFiles(directory);
});
