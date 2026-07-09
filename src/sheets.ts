import { getAccessToken } from './firebase';

const SHEETS_API_URL = 'https://workspace-proxy.aistudio.dev/v4/spreadsheets';

export async function exportDataToGoogleSheets(
  title: string,
  headers: string[],
  dataRows: any[][]
): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('User not authenticated with Google');
  }

  // 1. Create a new spreadsheet
  const createRes = await fetch(SHEETS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const createData = await createRes.json();
  const spreadsheetId = createData.spreadsheetId;
  const spreadsheetUrl = createData.spreadsheetUrl;

  // 2. Append data to the first sheet
  const values = [headers, ...dataRows];
  const updateRes = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values,
      }),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Failed to write data to spreadsheet: ${errText}`);
  }

  return spreadsheetUrl;
}
