// Versión de escritorio: no se envía ningún dato a servidores externos.
export async function POST() {
  return new Response(null, { status: 204 })
}
