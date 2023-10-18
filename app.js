const express = require("express");
const app = express();
const path = require("path");
const port = 3000;
const fileUpload = require("express-fileupload");
app.use(express.json());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, "public")));
const { PDFDocument } = require("pdf-lib");
const crypto = require("crypto");
const fs = require("fs");
const { basename, extname } = require("path");

// Función para generar una clave simétrica aleatoria
function generateRandomKey() {
  return crypto.randomBytes(32); // 256 bits (cambiar según tus necesidades)
}

app.post("/encrypt_pdf", async (req, res) => {
  try {
    if (!req.files || !req.files.pdf) {
      return res
        .status(400)
        .json({ success: false, message: "No se proporcionó un archivo PDF." });
    }

    const pdfFile = req.files.pdf;
    const encryptionType = req.body.encryptionType;

    if (encryptionType === "symmetric") {
      // Encriptación simétrica
      const password = req.body.password; // La clave para encriptar

      const pdfDoc = await PDFDocument.load(pdfFile.data);
      const pdfBytes = await pdfDoc.save();

      const cipher = crypto.createCipher("aes-256-cbc", Buffer.from(password));
      const encryptedData = Buffer.concat([
        cipher.update(pdfBytes),
        cipher.final(),
      ]);

      fs.writeFileSync(
        path.join(__dirname, "public", "output_symmetric.pdf"),
        encryptedData
      );

      res.json({ success: true, filePath: "output_symmetric.pdf" });
    } else if (encryptionType === "asymmetric") {
      // Encriptación asimétrica
      const publicKeyPath = "./keys/public_key.pem";
      const privateKeyPath = "./keys/private_key.pem";

      const baseFileName = basename(pdfFile.name, extname(pdfFile.name));
      const outputFile = `${baseFileName}_encriptado.pdf`;

      // Genera una clave simétrica aleatoria
      const symmetricKey = generateRandomKey();

      // Cifra el PDF con la clave simétrica
      const pdfData = pdfFile.data;
      const cipher = crypto.createCipher("aes-256-cbc", symmetricKey);
      const encryptedPdfData = Buffer.concat([
        cipher.update(pdfData),
        cipher.final(),
      ]);

      // Cifra la clave simétrica con la clave pública RSA
      const publicKey = fs.readFileSync(publicKeyPath, "utf8");
      const encryptedSymmetricKey = crypto.publicEncrypt(
        publicKey,
        symmetricKey
      );

      // Guarda el PDF cifrado y la clave simétrica cifrada
      fs.writeFileSync(
        path.join(__dirname, "public", outputFile),
        encryptedPdfData
      );
      fs.writeFileSync(
        path.join(__dirname, "public", `${baseFileName}_key.bin`),
        encryptedSymmetricKey
      );

      res.json({
        success: true,
        filePath: outputFile,
        keyPath: `${baseFileName}_key.bin`,
      });
    } else {
      res.json({ success: false, message: "Tipo de encriptación no válido." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message:
        "Ocurrió un error al encriptar el PDF. Detalles: " + error.message,
    });
  }
});

app.post("/decrypt_pdf", async (req, res) => {
  try {
    const decryptionType = req.body.decryptionType;
    const pdfFile = req.files.pdf;
    const keyFile = req.files.key;

    if (!pdfFile || !pdfFile.name.endsWith(".pdf") || !keyFile) {
      return res.status(400).json({
        success: false,
        message:
          "Por favor, proporcione un archivo PDF válido y un archivo de clave.",
      });
    }

    if (decryptionType === "symmetric") {
      // Desencriptación simétrica
      const password = req.body.password; // La clave para desencriptar

      const pdfData = fs.readFileSync(pdfFile.tempFilePath);
      const cipher = crypto.createDecipher(
        "aes-256-cbc",
        Buffer.from(password)
      );
      const decryptedData = Buffer.concat([
        cipher.update(pdfData),
        cipher.final(),
      ]);

      fs.writeFileSync(
        path.join(__dirname, "public", "output_decrypted.pdf"),
        decryptedData
      );

      res.json({ success: true, filePath: "output_decrypted.pdf" });
    } else if (decryptionType === "asymmetric") {
      // Desencriptación asimétrica
      const privateKeyPath = "./keys/private_key.pem";
      const publicKeyPath = "./keys/public_key.pem";

      const baseFileName = basename(pdfFile.name, extname(pdfFile.name));
      const keyData = fs.readFileSync(keyFile.tempFilePath);

      // Lee la clave privada
      const privateKey = fs.readFileSync(privateKeyPath, "utf8");

      // Descifra la clave simétrica con la clave privada RSA
      const symmetricKey = crypto.privateDecrypt(privateKey, keyData);

      console.log("Symmetric Key: ", symmetricKey);

      // Lee el PDF cifrado
      const pdfData = fs.readFileSync(pdfFile.tempFilePath);

      // Utiliza la clave simétrica para descifrar el PDF
      const decipher = crypto.createDecipher("aes-256-cbc", symmetricKey);
      const decryptedPdfData = Buffer.concat([
        decipher.update(pdfData),
        decipher.final(),
      ]);

      fs.writeFileSync(
        path.join(__dirname, "public", `${baseFileName}_decrypted.pdf`),
        decryptedPdfData
      );

      res.json({ success: true, filePath: `${baseFileName}_decrypted.pdf` });
    } else {
      res.json({
        success: false,
        message: "Tipo de desencriptación no válido.",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message:
        "Ocurrió un error al desencriptar el PDF. Detalles: " + error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor en funcionamiento en el puerto ${port}`);
});
