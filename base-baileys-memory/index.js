import pkg from '@bot-whatsapp/bot';
const { createBot, createProvider, createFlow, addKeyword, EVENTS } = pkg;
import QRPortalWeb from '@bot-whatsapp/portal';
import BaileysProvider from '@bot-whatsapp/provider/baileys';
import MockAdapter from '@bot-whatsapp/database/mock';
import fetch from 'node-fetch'; // Importamos fetch para hacer llamadas HTTP

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
  await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  // Configuración de QRPortalWeb
  QRPortalWeb();

  console.log("✅ Bot iniciado exitosamente");
};

main();
