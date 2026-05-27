const Groq = require('groq-sdk');
const { buscarProducto } = require('../tools/buscarProducto');
const { registrarEntrada } = require('../tools/registrarEntrada');
const { registrarSalida } = require('../tools/registrarSalida');
const { productosBajoStock } = require('../tools/productosBajoStock');
const { recomendarReabastecimiento } = require('../tools/recomendarReabastecimiento');

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'pega_aqui_tu_api_key_de_groq') {
    throw new Error('Falta configurar GROQ_API_KEY en el archivo .env');
  }
  return new Groq({ apiKey });
}

function herramientasDefinicion() {
  return [
    {
      type: 'function',
      function: {
        name: 'buscar_producto',
        description: 'Busca productos por nombre, categoría o límite de stock.',
        parameters: {
          type: 'object',
          properties: {
            nombre: { type: 'string' },
            categoria: { type: 'string' },
            stockMenorA: { type: 'number' }
          }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'registrar_entrada',
        description: 'Registra una entrada de inventario para un producto.',
        parameters: {
          type: 'object',
          required: ['producto', 'cantidad'],
          properties: {
            producto: { type: 'string' },
            cantidad: { type: 'number' },
            costo: { type: 'number' },
            motivo: { type: 'string' }
          }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'registrar_salida',
        description: 'Registra una salida de inventario para un producto.',
        parameters: {
          type: 'object',
          required: ['producto', 'cantidad'],
          properties: {
            producto: { type: 'string' },
            cantidad: { type: 'number' },
            motivo: { type: 'string' }
          }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'productos_bajo_stock',
        description: 'Devuelve productos que están en o por debajo del stock mínimo.',
        parameters: {
          type: 'object',
          properties: {
            categoria: { type: 'string' }
          }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'recomendar_reabastecimiento',
        description: 'Genera recomendaciones de reabastecimiento y opcionalmente envía correos a proveedores.',
        parameters: {
          type: 'object',
          properties: {
            categoria: { type: 'string' },
            enviarCorreo: { type: 'boolean' }
          }
        }
      }
    }
  ];
}

async function ejecutarTool(name, args) {
  switch (name) {
    case 'buscar_producto':
      return buscarProducto(args || {});
    case 'registrar_entrada':
      return registrarEntrada(args || {});
    case 'registrar_salida':
      return registrarSalida(args || {});
    case 'productos_bajo_stock':
      return productosBajoStock(args || {});
    case 'recomendar_reabastecimiento':
      return await recomendarReabastecimiento(args || {});
    default:
      throw new Error(`Tool no soportada: ${name}`);
  }
}

async function procesarMensaje(mensaje) {
  const client = getGroqClient();
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const messages = [
    {
      role: 'system',
      content: `Eres un agente de inventario para un pequeño negocio. Debes decidir qué herramienta usar según la solicitud del usuario. Usa solo las tools disponibles. Si la solicitud requiere consultar o modificar inventario, llama la herramienta adecuada. Después de recibir el resultado de la tool, responde en español de forma clara, breve y útil.`
    },
    {
      role: 'user',
      content: mensaje
    }
  ];

  const first = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages,
    tools: herramientasDefinicion(),
    tool_choice: 'auto'
  });

  const assistantMessage = first.choices[0].message;
  const toolCalls = assistantMessage.tool_calls || [];

  if (!toolCalls.length) {
    return {
      accion: 'respuesta_directa_llm',
      respuesta: assistantMessage.content || 'No se pudo interpretar la solicitud.',
      data: null
    };
  }

  const dataTools = [];
  messages.push(assistantMessage);

  for (const call of toolCalls) {
    const name = call.function.name;
    const args = JSON.parse(call.function.arguments || '{}');
    const resultado = await ejecutarTool(name, args);
    dataTools.push({ tool: name, args, resultado });

    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: JSON.stringify(resultado)
    });
  }

  const second = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages
  });

  const respuesta = second.choices[0].message.content || 'Operación completada.';
  const primary = dataTools[0] || null;

  return {
    accion: primary?.tool || 'tool_ejecutada',
    respuesta,
    data: primary?.resultado || dataTools
  };
}

module.exports = { procesarMensaje };
