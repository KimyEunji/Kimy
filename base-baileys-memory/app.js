import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express from 'express';
import QRCode from 'qrcode';
import fetch from 'node-fetch';
import pkg from '@bot-whatsapp/bot';
const { createBot, createProvider, createFlow, addKeyword, EVENTS } = pkg;
import BaileysProvider from '@bot-whatsapp/provider/baileys';
import MockAdapter from '@bot-whatsapp/database/mock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

let currentQR = ''; // Almacena el QR generado

// 🔹 Función para manejar el QR de Baileys
const handleQR = (qr) => {
    currentQR = qr; // Actualiza el QR en memoria
    console.log("🔹 Nuevo QR generado:", qr);
};

// 🔹 API para obtener el QR dinámico
app.get('/qr', async (req, res) => {
    try {
        if (!currentQR) {
            return res.status(500).send("QR aún no generado. Intenta más tarde.");
        }
        const qrCodeData = await QRCode.toDataURL(currentQR);
        res.send(`<img src="${qrCodeData}" alt="Código QR">`);
    } catch (err) {
        console.error("❌ Error generando el código QR:", err);
        res.status(500).send("Error generando el código QR");
    }
});

// 🔹 Página principal que muestra el QR
app.get('/', async (req, res) => {
    res.send(`
        <h1>Kimy Min-ji.IA</h1>
        <p>Escanea el código QR para iniciar una conversación en WhatsApp</p>
        <img src="/qr" alt="Código QR">
    `);
});

// 🔹 Flujo de bienvenida
const flowWelcome = addKeyword(EVENTS.WELCOME)
  .addAnswer("🙌 ¡Hola, bienvenido!", { delay: 2000 })
  .addAnswer([
    'Hola, soy Kimy Minji.IA',
    'tu asistente personal de WhatsApp',
    'desarrollada por el equipo de KimyCompany'
  ]);

// 🔹 Flujo de consultas
const processMessage = async (message) => {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama3', prompt: message })
        });

        const responseText = await response.text();
        console.log("Respuesta de Ollama:", responseText);

        return responseText || "No se pudo obtener una respuesta completa.";
    } catch (error) {
        console.error("❌ Error al comunicarse con Ollama:", error);
        return "Hubo un error al procesar tu mensaje. 😢";
    }
};

const flowConsulta = addKeyword('consultar')
  .addAnswer('Por favor, dime tu pregunta:', { capture: true }, async (ctx, { flowDynamic }) => {
    const respuesta = await processMessage(ctx.body);
    await flowDynamic([respuesta]);  
  });

// 🔹 Inicialización del bot
const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([flowWelcome, flowConsulta]);
    const adapterProvider = createProvider(BaileysProvider, { onQR: handleQR });

    await createBot({ flow: adapterFlow, provider: adapterProvider, database: adapterDB });

    console.log("✅ Bot iniciado exitosamente");
};

main();

// 🔹 Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
