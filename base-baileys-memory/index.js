import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pkg from '@bot-whatsapp/bot';
const { createBot, createProvider, createFlow, addKeyword, EVENTS } = pkg;
import QRPortalWeb from '@bot-whatsapp/portal';
import BaileysProvider from '@bot-whatsapp/provider/baileys';
import MockAdapter from '@bot-whatsapp/database/mock';
import fetch from 'node-fetch'; // Importamos fetch para hacer llamadas HTTP
import express from 'express'; // Importamos Express
import path from 'path'; // Importamos 'path' para gestionar rutas de archivos estáticos

// Función para obtener el directorio actual en un módulo ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  const app = express(); // Asegúrate de crear `app` antes de usarlo
  const adapterDB = new MockAdapter();
  const adapterFlow = createFlow([flowWelcome, flowConsulta]);
  const adapterProvider = createProvider(BaileysProvider);

  // Esto asegura que el bot se inicialice correctamente
  await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  // Configuración de la ruta estática para el portal QR
  const staticPath = path.join(__dirname, 'public');
  app.use(express.static(staticPath));

  // Configuración de QRPortalWeb con el rootPath
  QRPortalWeb({
      rootPath: staticPath // Asegúrate de que el rootPath esté bien definido
  });

  console.log("✅ Bot iniciado exitosamente");

  // Configuración de Express para manejar el servidor web
  const PORT = process.env.PORT || 3001; // Si Render proporciona el puerto, se usa, sino, por defecto será 3000

  // Ruta para verificar que el servidor está funcionando
  app.get('/', (req, res) => {
    res.send("Bot de WhatsApp en funcionamiento.");
  });

  // Función para manejar el error de puerto en uso y probar puertos consecutivos
  const startServer = async (port) => {
    try {
      await app.listen(port);
      console.log(`Server running on port ${port}`);
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(`El puerto ${port} está en uso. Intentando con otro puerto...`);
        startServer(port + 1); // Intenta el siguiente puerto
      } else {
        console.error(`❌ Error al iniciar el servidor: ${err.message}`);
      }
    }
  };

  startServer(PORT); // Inicia el servidor en el puerto definido
};

main();
