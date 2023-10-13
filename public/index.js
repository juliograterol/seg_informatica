document
  .querySelector('input[type="radio"][value="symmetric"]')
  .addEventListener("change", () => {
    document.getElementById("symmetric-options").style.display = "block";
    document.getElementById("asymmetric-options").style.display = "none";
  });

document
  .querySelector('input[type="radio"][value="asymmetric"]')
  .addEventListener("change", () => {
    document.getElementById("asymmetric-options").style.display = "block";
    document.getElementById("symmetric-options").style.display = "none";
  });

async function encryptPDF() {
  const responseMessage = document.getElementById("output-message");
  responseMessage.textContent = "";

  try {
    const formData = new FormData(document.getElementById("upload-form"));

    const response = await fetch("/encrypt_pdf", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      responseMessage.textContent =
        "PDF encriptado exitosamente. Descargue el archivo: ";
      const downloadLink = document.createElement("a");
      downloadLink.href = data.filePath;
      downloadLink.textContent = "Descargar PDF encriptado";
      downloadLink.download = "encrypted_pdf.pdf";
      responseMessage.appendChild(downloadLink);
    } else {
      responseMessage.textContent =
        data.message || "Ocurrió un error al encriptar el PDF.";
    }
  } catch (error) {
    console.error(error);
    responseMessage.textContent =
      "Ocurrió un error al comunicarse con el servidor. Detalles: " +
      error.message;
  }
}

async function decryptPDF() {
  const responseMessage = document.getElementById("output-message");
  responseMessage.textContent = "";

  try {
    const formData = new FormData(document.getElementById("upload-form"));

    const response = await fetch("/decrypt_pdf", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      responseMessage.textContent =
        "PDF desencriptado exitosamente. Descargue el archivo:";
      const downloadLink = document.createElement("a");
      downloadLink.href = data.filePath;
      downloadLink.textContent = "PDF Desencriptado";
      downloadLink.download = "decrypted_pdf.pdf";
      responseMessage.appendChild(downloadLink);
    } else {
      responseMessage.textContent =
        data.message || "Ocurrió un error al desencriptar el PDF.";
    }
  } catch (error) {
    console.error(error);
    responseMessage.textContent =
      "Ocurrió un error al comunicarse con el servidor. Detalles: " +
      error.message;
  }
}
