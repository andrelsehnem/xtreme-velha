// Versão web de lan.js: o navegador não abre sockets TCP, então o multiplayer LAN
// só existe no app Android. O Metro escolhe este arquivo sozinho no build web.

export const lanUnavailableReason = 'O multiplayer LAN só funciona no app Android.'

export async function createHost() {
  throw new Error(lanUnavailableReason)
}

export function joinHost({ onError }) {
  onError(lanUnavailableReason)
  return { me: 'O', play() {}, reset() {}, close() {} }
}
