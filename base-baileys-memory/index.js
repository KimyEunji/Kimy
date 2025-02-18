import pkg from '@bot-whatsapp/bot'; 
const { createBot, createProvider, createFlow, addKeyword, EVENTS } = pkg;
import QRPortalWeb from '@bot-whatsapp/portal';
import BaileysProvider from '@bot-whatsapp/provider/baileys';
import MockAdapter from '@bot-whatsapp/database/mock';
import fetch from 'node-fetch'; // Importamos fetch para hacer llamadas HTTP
import express from 'express'; // Importamos Express
import { fileURLToPath } from 'url'; // Para manejar rutas en módulos ES
import path from 'path'; // Para manejar rutas de archivos

// Obtener la ruta del directorio actual en un módulo ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta del archivo QR generado (bot.qr.png)
const QR_FILE_PATH = path.join(__dirname, 'bot.qr.png'); // Asegúrate de que la ruta sea correcta

// Función para comunicarse con la API de Ollama
const processMessage = async (message) => {
    let fullResponse = ''; // Variable para acumular la respuesta completa

    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3', // Asegúrate de que tienes este modelo instalado
                prompt: message
            })
        });

        // Verifica el contenido de la respuesta antes de analizarla
        const responseText = await response.text();
        console.log("Respuesta de Ollama:", responseText);  // Esto mostrará la respuesta cruda de la API

        // Separamos la respuesta por líneas (cada fragmento)
        const parts = responseText.split('\n');
        
        // Concatenamos las partes hasta obtener la respuesta completa
        for (const part of parts) {
            const data = JSON.parse(part); // Parseamos cada parte individual
            fullResponse += data.response || '';
            if (data.done) {
                break; // Si la respuesta está completa, salimos del loop
            }
        }

        return fullResponse || "No se pudo obtener una respuesta completa.";

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

// Flujo para manejar consultas con Ollama
const flowConsulta = addKeyword('consultar')
  .addAnswer('Por favor, dime tu pregunta:', { capture: true }, async (ctx, { flowDynamic }) => {
    const pregunta = ctx.body || null;

    if (!pregunta) {
      await flowDynamic(['No entendí tu pregunta, por favor intenta nuevamente.']);
      return;
    }

    try {
      const respuesta = await processMessage(pregunta);
      await flowDynamic([respuesta]);  
    } catch (error) {
      console.error("Error procesando la pregunta:", error);
      await flowDynamic(['Lo siento, hubo un error al procesar tu solicitud.']);
    }
  });

// Inicialización del bot
const main = async () => {
  const adapterDB = new MockAdapter();
  const adapterFlow = createFlow([flowWelcome, flowConsulta]);
  const adapterProvider = createProvider(BaileysProvider);

  // Esto asegura que el bot se inicialice correctamente
  const bot = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  // Inicia QRPortalWeb en el puerto 3000
  QRPortalWeb();

  // Crear aplicación Express en el puerto 4000
  const app = express();

  // Ruta para mostrar el QR generado
  app.get('/', (req, res) => {
    res.send('<h1>¡Bienvenido! Escanea este QR para conectar el Bot de Whatsapp.</h1><br><img src="/qr" />');
  });

  // Ruta para mostrar el QR en formato de imagen desde el archivo 'bot.qr.png'
  app.get('/qr', (req, res) => {
    res.sendFile(QR_FILE_PATH, (err) => {
      if (err) {
        console.error("Error al enviar el QR:", err);
        res.status(500).send('Error al cargar el QR');
      }
    });
  });

  // Configurar Express para que escuche en el puerto 4000
  app.listen(4000, () => {
    console.log('Servidor Express escuchando en el puerto 4000');
  });
};

// Llamamos a la función main para iniciar todo
main();
