const express = require("express");
const app = express().use(express.json());

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // EL TOKEN QUE PONDRE EN META ES: mi_secreto_123
  if (mode === "subscribe" && token === "mi_secreto_123") {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", (req, res) => {
  console.log("Mensaje:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => console.log("Servidor Online"));