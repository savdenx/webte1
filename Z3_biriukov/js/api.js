const baseUrl = 'https://wt1zadanie.iolab.sk/api';

export async function request(name, path = '', method = 'GET', data) {
  const url = `${baseUrl}/${encodeURIComponent(name)}${path}`;
  const options = {
    method,
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  };
  if (data !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(data);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch {
    if (method === 'GET') {
      throw new Error('Server nie je dostupný. Skontrolujte pripojenie a skúste znova.');
    }
    throw new Error('Odpoveď neprišla. Pred opakovaním obnovte zoznam a overte, či sa zmena uložila.');
  }
  if (!response.ok) {
    const messages = {
      403: 'Identifikátor nie je povolený. Použite identifikátor pridelený v škole.',
      404: 'Úloha už neexistuje. Obnovte zoznam.',
      422: 'Server odmietol údaje. Skontrolujte názov a dátumy.',
    };
    const message = messages[response.status] || `Chyba servera (${response.status}). Skúste znova.`;
    throw new Error(message);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}