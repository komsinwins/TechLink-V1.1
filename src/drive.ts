import { getAccessToken } from './firebase';

const DRIVE_API_URL = 'https://workspace-proxy.aistudio.dev/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://workspace-proxy.aistudio.dev/upload/drive/v3/files?uploadType=multipart';

export async function getOrCreateFolder(folderName: string, accessToken: string): Promise<string> {
  // Search for the folder
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
  const searchRes = await fetch(`${DRIVE_API_URL}?q=${query}&fields=files(id, name)`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    throw new Error(`Failed to search for folder: ${searchRes.statusText}`);
  }

  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id; // Return existing folder ID
  }

  // Create folder if not found
  const createRes = await fetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create folder: ${createRes.statusText}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

export async function uploadFileToDrive(
  file: File | Blob,
  fileName: string,
  folderName: string,
  accessToken: string
): Promise<{ fileId: string; webViewLink: string; webContentLink?: string; thumbnailLink?: string }> {
  const folderId = await getOrCreateFolder(folderName, accessToken);

  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const metadataBlob = new Blob([
    delimiter,
    'Content-Type: application/json\r\n\r\n',
    JSON.stringify(metadata),
    delimiter,
    'Content-Type: ' + (file.type || 'application/octet-stream') + '\r\n\r\n'
  ], { type: 'text/plain' });

  const closeBlob = new Blob([close_delim], { type: 'text/plain' });

  const body = new Blob([metadataBlob, file, closeBlob]);

  const uploadRes = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: body,
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Failed to upload file content: ${uploadRes.status} ${uploadRes.statusText} - ${errorText}`);
  }
  
  const fileData = await uploadRes.json();
  const fileId = fileData.id;
  
  try {
    // Make the file publicly accessible so images can be displayed
    await fetch(`${DRIVE_API_URL}/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (e) {
    console.error('Failed to set file permissions:', e);
  }

  // Get the webViewLink
  const getRes = await fetch(`${DRIVE_API_URL}/${fileId}?fields=id,webViewLink,webContentLink,thumbnailLink`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!getRes.ok) {
    return { fileId: fileId, webViewLink: '' };
  }

  const getData = await getRes.json();
  return { 
    fileId: getData.id, 
    webViewLink: getData.webViewLink,
    webContentLink: getData.webContentLink,
    thumbnailLink: getData.thumbnailLink
  };
}

// Convert base64 data URL to Blob
export function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : '';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
