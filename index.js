const express = require("express");
const axios = require("axios");
const app = express().use(express.json());

// Configuraciones desde Variables de Entorno (las pondremos en Render)
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
const VERIFY_TOKEN = "mi_secreto_123"; 

// Verificación del Webhook
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recepción y procesamiento del mensaje
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    
    if (body.object === "whatsapp_business_account" && 
        body.entry?.[0].changes?.[0].value.messages?.[0]) {
      
      const message = body.entry[0].changes[0].value.messages[0];
      const text = message.text.body; // El texto que envió el usuario
      const from = message.from; // El teléfono del usuario

      // LÓGICA DE EXTRACCIÓN SIMPLE:
      // Esperamos: "Nombre Apellido Status" (ej: Juan Perez Activo)
      const partes = text.split(" ");
      
      if (partes.length >= 3) {
        const nombre = partes[0];
        const apellido = partes[1];
        const status = partes[2];

        // ENVIAR A AIRTABLE
        await axios.post(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`,
          {
            fields: {
              "Nombre": nombre,
              "Apellido": apellido,
              "Status": status,
              "Telefono": from // Opcional: agrega esta columna en Airtable si quieres
            }
          },
          {
            headers: {
              Authorization: `Bearer ${AIRTABLE_TOKEN}`,
              "Content-Type": "application/json"
            }
          }
        );
        console.log(`Guardado con éxito: ${nombre} ${apellido}`);
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error("Error procesando:", error.response?.data || error.message);
    res.sendStatus(200); // Siempre respondemos 200 a Meta para que no reintente
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Bot listo"));
