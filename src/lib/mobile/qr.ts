import QRCode from "qrcode";

/** QR como SVG (vectorial, nítido en cualquier pantalla). Corrección de error media. */
export function renderQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}
