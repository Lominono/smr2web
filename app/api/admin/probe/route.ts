import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const headers = new Headers();
  headers.set('X-SMR-Vulnerability', 'Buffer-Offset-0x7F4A');
  headers.set('X-SMR-Subnet', '192.168.10.0/27');
  headers.set('X-SMR-Challenge', 'Compute broadcast IP and decode base64 token');
  headers.set('Content-Type', 'application/json');

  return new NextResponse(
    JSON.stringify({
      system: 'SMR2-KERNEL-GATEWAY',
      version: '4.19.0-21-smr2-hardened',
      architecture: 'x86_64',
      status: 'AUTHENTICATION_REQUIRED',
      network_segment: {
        interface: 'eth0',
        subnet: '192.168.10.0/27',
        netmask: '255.255.255.224',
        hint_broadcast: '¿Cuál es la última dirección IP del bloque /27?',
      },
      cipher_payload: {
        algorithm: 'Base64',
        encoded_token: 'c21yMl9rM3JuM2xfcjAwdA==',
        format: 'auth <BROADCAST_IP>_<DECODED_TOKEN>',
      },
      forensics: [
        'Memory segment 0x0A2B contains secret payload vault.',
        'Direct access requires root privilege escalation.',
      ],
    }),
    {
      status: 200,
      headers,
    }
  );
}
