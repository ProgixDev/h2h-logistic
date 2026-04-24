import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCode from 'qrcode';
import type { Mission } from '@/types/mission';

function missionCode(mission: Mission): string {
  return `HTH-${mission.id.slice(-4).toUpperCase()}`;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function esc(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function qrDataUrl(payload: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 1,
      color: { dark: '#14248A', light: '#FFFFFFFF' },
    });
  } catch {
    return null;
  }
}

export async function generateBonEnvoiHtml(mission: Mission): Promise<string> {
  const code = missionCode(mission);
  const trackingCode = mission.package.trackingNumber ?? code;
  const qr = await qrDataUrl(trackingCode);

  const pickupAddress = mission.pickupHub.isOffHub
    ? esc(mission.pickupHub.offHubAddress ?? '')
    : esc(mission.pickupHub.name);
  const deliveryAddress = mission.deliveryHub.isOffHub
    ? esc(mission.deliveryHub.offHubAddress ?? '')
    : esc(mission.deliveryHub.name);

  const generatedAt = new Date().toLocaleString('fr-FR');

  return /* html */ `
  <!doctype html>
  <html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Bon d'envoi ${esc(code)}</title>
    <style>
      @page { size: A5 portrait; margin: 12mm; }
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        color: #1A1A1E;
        margin: 0;
        padding: 0;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #14248A;
        padding-bottom: 10px;
      }
      .brand {
        color: #14248A;
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.5px;
      }
      .title {
        font-size: 22px;
        font-weight: 800;
        color: #14248A;
        margin: 0;
      }
      .code-block {
        margin-top: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .code {
        font-size: 26px;
        font-weight: 800;
        color: #14248A;
        letter-spacing: 1px;
      }
      .code-sub {
        font-size: 11px;
        color: #6B7280;
        margin-top: 2px;
      }
      .qr img {
        width: 110px;
        height: 110px;
        display: block;
        border: 1px solid #E5E7EB;
        padding: 4px;
        background: #FFFFFF;
      }
      .section {
        margin-top: 14px;
        padding-top: 10px;
        border-top: 1px solid #E5E7EB;
      }
      .section h3 {
        margin: 0 0 6px 0;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #6B7280;
        font-weight: 700;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin: 4px 0;
        font-size: 12px;
      }
      .row .label { color: #6B7280; }
      .row .value { font-weight: 600; text-align: right; }
      .duo {
        display: flex;
        gap: 12px;
      }
      .duo .col {
        flex: 1;
        border: 1px solid #E5E7EB;
        border-radius: 6px;
        padding: 10px;
      }
      .duo h4 {
        margin: 0 0 6px 0;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #6B7280;
      }
      .duo .name {
        font-weight: 700;
        font-size: 13px;
      }
      .duo .sub {
        font-size: 11px;
        color: #6B7280;
        margin-top: 2px;
      }
      .instructions {
        margin-top: 14px;
        padding: 10px 12px;
        background: #F9F5FF;
        border-left: 3px solid #14248A;
        border-radius: 0 6px 6px 0;
        font-size: 11px;
        color: #28262C;
        line-height: 1.45;
      }
      .footer {
        margin-top: 18px;
        padding-top: 10px;
        border-top: 1px solid #E5E7EB;
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        color: #9CA3AF;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="brand">Hand to Hand Logistic</div>
        <h1 class="title">BON D'ENVOI</h1>
      </div>
    </div>

    <div class="code-block">
      <div>
        <div class="code">${esc(code)}</div>
        <div class="code-sub">Référence livraison — Numéro de colis&nbsp;: ${esc(trackingCode)}</div>
      </div>
      <div class="qr">
        ${qr ? `<img src="${qr}" alt="QR code colis" />` : `<div style="font-size:10px;color:#6B7280;">QR indisponible</div>`}
      </div>
    </div>

    <div class="section">
      <div class="duo">
        <div class="col">
          <h4>Vendeur</h4>
          <div class="name">${esc(mission.seller.name)}</div>
          <div class="sub">${pickupAddress}</div>
          <div class="sub">${esc(mission.pickupHub.city)}</div>
        </div>
        <div class="col">
          <h4>Acheteur</h4>
          <div class="name">${esc(mission.buyer.name)}</div>
          <div class="sub">${deliveryAddress}</div>
          <div class="sub">${esc(mission.deliveryHub.city)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h3>Colis</h3>
      <div class="row"><span class="label">Description</span><span class="value">${esc(mission.package.description)}</span></div>
      <div class="row"><span class="label">Taille</span><span class="value">${esc(mission.package.size)}</span></div>
      <div class="row"><span class="label">Poids</span><span class="value">${mission.package.weight.toFixed(1)} kg</span></div>
      ${mission.package.condition ? `<div class="row"><span class="label">État</span><span class="value">${esc(mission.package.condition)}</span></div>` : ''}
    </div>

    <div class="section">
      <h3>Trajet</h3>
      <div class="row"><span class="label">Prise en charge</span><span class="value">${formatDateTime(mission.pickupHub.scheduledTime)}</span></div>
      <div class="row"><span class="label">Hub collecte</span><span class="value">${pickupAddress}</span></div>
      <div class="row"><span class="label">Remise prévue</span><span class="value">${formatDateTime(mission.deliveryHub.scheduledTime)}</span></div>
      <div class="row"><span class="label">Hub livraison</span><span class="value">${deliveryAddress}</span></div>
    </div>

    <div class="section">
      <h3>Transporteur assigné</h3>
      <div class="row"><span class="label">Nom</span><span class="value">${esc(mission.transporter.name)}</span></div>
    </div>

    <div class="instructions">
      Collez ce bon sur le colis. Le transporteur scannera le QR code au moment de la prise en charge.
    </div>

    <div class="footer">
      <span>Hand to Hand Logistic · Bon d'envoi</span>
      <span>Généré le ${esc(generatedAt)}</span>
    </div>
  </body>
  </html>`;
}

export async function generateAndSharePdf(mission: Mission): Promise<void> {
  const html = await generateBonEnvoiHtml(mission);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: "Bon d'envoi",
      UTI: 'com.adobe.pdf',
    });
  }
}

export async function printBonEnvoi(mission: Mission): Promise<void> {
  const html = await generateBonEnvoiHtml(mission);
  await Print.printAsync({ html });
}

/** Offline-safe plain text summary (used when PDF generation fails). */
export function plainTextSummary(mission: Mission): string {
  const code = missionCode(mission);
  const trackingCode = mission.package.trackingNumber ?? code;
  return [
    `BON D'ENVOI — ${code}`,
    `Numéro de colis : ${trackingCode}`,
    '',
    `Vendeur : ${mission.seller.name}`,
    `Hub collecte : ${mission.pickupHub.name} (${mission.pickupHub.city})`,
    `Prise en charge : ${formatDateTime(mission.pickupHub.scheduledTime)}`,
    '',
    `Acheteur : ${mission.buyer.name}`,
    `Hub livraison : ${mission.deliveryHub.name} (${mission.deliveryHub.city})`,
    `Remise prévue : ${formatDateTime(mission.deliveryHub.scheduledTime)}`,
    '',
    `Colis : ${mission.package.description}`,
    `Taille ${mission.package.size} — ${mission.package.weight.toFixed(1)} kg`,
    '',
    `Transporteur : ${mission.transporter.name}`,
    '',
    'Collez ce bon sur le colis. Le transporteur scannera le QR au moment de la prise en charge.',
  ].join('\n');
}
