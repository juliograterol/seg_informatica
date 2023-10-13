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

app.post("/encrypt_pdf", async (req, res) => {
  try {
    if (!req.files || !req.files.pdf) {
      return res
        .status(400)
        .json({ success: false, message: "No se proporcionó un archivo PDF." });
    }

    const pdfFile = req.files.pdf;
    const encryptionType = req.body.encryptionType;
    const password = req.body.password; // La clave para encriptar

    if (encryptionType === "symmetric") {
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
      const publicKeyPEM = req.body.publicKey; // Clave pública en formato PEM

      const pdfDoc = await PDFDocument.load(pdfFile.data);
      const pdfBytes = await pdfDoc.save();

      // Cifrar el archivo PDF con la clave pública
      const encryptedData = crypto.publicEncrypt(publicKeyPEM, pdfBytes);

      fs.writeFileSync(
        path.join(__dirname, "public", "output_asymmetric.pdf"),
        encryptedData
      );

      res.json({ success: true, filePath: "output_asymmetric.pdf" });
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
    const decryptionType = req.body.encryptionType;
    const pdfFile = req.files.pdf; // Asegúrate de que el campo 'pdf' existe en la solicitud
    const decryptionPassword = req.body.password; // La clave para desencriptar

    if (!pdfFile || !pdfFile.name.endsWith(".pdf")) {
      return res.status(400).json({
        success: false,
        message: "Por favor, proporcione un archivo PDF válido.",
      });
    }

    if (decryptionType === "symmetric") {
      const encryptedData = fs.readFileSync(
        path.join(__dirname, "public", pdfFile.name)
      );

      const decipher = crypto.createDecipher(
        "aes-256-cbc",
        Buffer.from(decryptionPassword)
      );

      const decryptedData = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      fs.writeFileSync(
        path.join(__dirname, "public", "output_decrypted.pdf"),
        decryptedData
      );

      res.json({ success: true, filePath: "output_decrypted.pdf" });
    } else {
      return res.status(400).json({
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
