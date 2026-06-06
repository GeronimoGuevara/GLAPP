import postgres from 'postgres';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { query, params } = JSON.parse(event.body);

    if (!query) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing query parameter' }) };
    }

    const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Database URL not configured' }) };
    }

    const sql = postgres(DATABASE_URL, { ssl: 'require' });

    const result = await sql.unsafe(query, params || []);
    
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ success: true, result }) 
    };
  } catch (error) {
    console.error('Database query error:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ success: false, error: error.message }) 
    };
  }
};
