// Script to convert image to base64
const fs = require('fs');

// Path to the image file (replace with your image path)
const imagePath = './src/assets/images/logo.png'; // Corrected path
const outputPath = './logo_base64.txt'; // Path to save the base64 string

// Read the image file
fs.readFile(imagePath, (err, data) => {
  if (err) {
    console.error('Error reading image file:', err);
    return;
  }

  // Convert image data to base64
  const base64Image = data.toString('base64');

  // Write the base64 string to a file
  fs.writeFile(outputPath, base64Image, (err) => {
    if (err) {
      console.error('Error writing base64 to file:', err);
      return;
    }
    console.log(`Base64 string saved to ${outputPath}`);
  });
});
