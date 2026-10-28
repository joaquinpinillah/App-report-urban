// Reduce la foto y la vuelve a codificar como JPEG. Al pasar por un canvas
// se pierden los metadatos EXIF (incluida la ubicación del teléfono).
export async function prepararFoto(archivo: File, ladoMax = 1600): Promise<Blob> {
  const img = await createImageBitmap(archivo)
  const escala = Math.min(1, ladoMax / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * escala)
  canvas.height = Math.round(img.height * escala)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((ok, falla) =>
    canvas.toBlob((b) => (b ? ok(b) : falla(new Error('No se pudo procesar la foto'))), 'image/jpeg', 0.82),
  )
}
