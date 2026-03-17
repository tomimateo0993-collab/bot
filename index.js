const express = require("express");
const axios = require("axios");
const app = express().use(express.json());

// Token de verificacion para Meta
const VERIFY_TOKEN = "mi_secreto_123"; 

app.post("/webhook", async (req, res) => {
  const body = req.body;
  const message = body.entry?.[0].changes?.[0].value.messages?.[0];

  if (message) {
    const from = message.from;
    const text = message.text.body.trim();
    const lowerText = text.toLowerCase();

    // 1. Detectar si el usuario pide ayuda o el formato es incorrecto
    const datos = text.split(",").map(item => item.trim());

    if (lowerText === "hola" || lowerText === "ayuda" || datos.length < 6) {
      const instrucciones = `*🚛 Asistente Dinatec*\n\nPara registrar un servicio, envia los datos separados por comas en este orden:\n\n_Cliente, Vehiculo, Fecha Retiro, Direccion Retiro, Fecha Devolucion, Direccion Devolucion, Observaciones_\n\n*Ejemplo:*\n_Juan Perez, Toyota Hilux, 18/03/2026, Sede Central, 20/03/2026, Taller Salta, Sin novedades_`;
      await enviarWhatsApp(from, instrucciones);
    } 
    else {
      // 2. Procesar y enviar a Airtable (CAMPOS SIN TILDES)
      try {
        await axios.post(
          `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`,
          {
            fields: {
              "Clientes": datos[0],
              "Vehiculos": datos[1],
              "Fecha de Retiro": datos[2],
              "Direccion de Retiro": datos[3],
              "Fecha de Devolucion": datos[4],
              "Direccion de Devolucion": datos[5],
              "Observaciones": datos[6] || "Sin observaciones",
              "Telefono": from
            }
          },
          { 
            headers: { 
              Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
              "Content-Type": "application/json"
            } 
          }
        );
        await enviarWhatsApp(from, "✅ *¡Registro Exitoso!*\nLos datos se han cargado correctamente en el sistema de Gestion de Flota.");
      } catch (err) {
        console.error("Error Airtable:", err.response?.data || err.message);
        await enviarWhatsApp(from, "❌ *Error de sistema.*\nHubo un problema al guardar en Airtable. Verifica que los nombres de las columnas en Airtable NO tengan tildes.");
      }
    }
  }
  res.sendStatus(200);
});

async function enviarWhatsApp(to, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text }
      },
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
    );
  } catch (e) { console.log("Error API WhatsApp:", e.message); }
}

app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) res.status(200).send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});

app.listen(process.env.PORT || 3000, () => console.log("Bot Dinatec Online"));
