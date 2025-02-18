import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pkg from '@bot-whatsapp/bot';
const { createBot, createProvider, createFlow, addKeyword, EVENTS } = pkg;
import BaileysProvider from '@bot-whatsapp/provider/baileys';
import MockAdapter from '@bot-whatsapp/database/mock';
import QRCode from 'qrcode';  // Librería para generar el QR en tiempo real
import express from 'express'; 
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Función para comunicarse con la API de Ollama
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

// Flujo de bienvenida
const flowWelcome = addKeyword(EVENTS.WELCOME)
  .addAnswer("🙌 ¡Hola, bienvenido!", { delay: 2000 })
  .addAnswer([ 
    'Hola, soy Kimy Minji.IA', 
    'tu asistente personal de WhatsApp', 
    'desarrollada por el equipo de KimyCompany' 
  ]);

// Flujo para consultas
const flowConsulta = addKeyword('consultar')
  .addAnswer('Por favor, dime tu pregunta:', { capture: true }, async (ctx, { flowDynamic }) => {
    const respuesta = await processMessage(ctx.body);
    await flowDynamic([respuesta]);  
  });

// Inicialización del bot
const main = async () => {
    const app = express();
    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([flowWelcome, flowConsulta]);
    const adapterProvider = createProvider(BaileysProvider);

    await createBot({ flow: adapterFlow, provider: adapterProvider, database: adapterDB });

    console.log("✅ Bot iniciado exitosamente");

    const PORT = process.env.PORT || 3000;

    // API para obtener el QR dinámicamente
    app.get('/qr', async (req, res) => {
        try {
            const qrCodeData = await QRCode.toDataURL('https://wa.me/123456789'); // Reemplaza con el link real de WhatsApp
            res.send(`<img src="${qrCodeData}" alt="QR Code">`);
        } catch (err) {
            res.status(500).send("Error generando el código QR");
        }
    });

    app.get('/', (req, res) => {
        res.send(`
            <h1>Kimy Min-ji.IA</h1>
            <p>Escanea el código QR para iniciar una conversación en WhatsApp</p>
            <img src="/qr" alt="QR Code">
        `);
    });

    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
};

main();
