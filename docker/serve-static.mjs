import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const staticRoot = process.env.STATIC_ROOT ?? '/app/dist'
const port = Number.parseInt(process.env.PORT ?? '3000', 10)

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
])

function getContentType(filePath) {
  return contentTypes.get(extname(filePath)) ?? 'application/octet-stream'
}

function isAssetRequest(pathname) {
  return extname(pathname) !== ''
}

function resolvePathname(requestUrl) {
  return new URL(requestUrl, 'http://127.0.0.1').pathname
}

function toFilePath(pathname) {
  const decodedPath = decodeURIComponent(pathname)
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '')
  return join(staticRoot, normalizedPath)
}

async function readExistingFile(filePath) {
  const fileStats = await stat(filePath)
  if (fileStats.isDirectory()) {
    const indexPath = join(filePath, 'index.html')
    return {
      body: await readFile(indexPath),
      filePath: indexPath,
    }
  }

  return {
    body: await readFile(filePath),
    filePath,
  }
}

async function readResponseBody(pathname) {
  try {
    const resolvedFile = await readExistingFile(toFilePath(pathname))
    return {
      body: resolvedFile.body,
      contentType: getContentType(resolvedFile.filePath),
      statusCode: 200,
    }
  } catch {
    if (isAssetRequest(pathname)) {
      return {
        body: Buffer.from('Not Found'),
        contentType: 'text/plain; charset=utf-8',
        statusCode: 404,
      }
    }

    const indexPath = join(staticRoot, 'index.html')
    return {
      body: await readFile(indexPath),
      contentType: 'text/html; charset=utf-8',
      statusCode: 200,
    }
  }
}

const server = createServer(async (request, response) => {
  const pathname = resolvePathname(request.url ?? '/')
  const { body, contentType, statusCode } = await readResponseBody(pathname)

  response.writeHead(statusCode, { 'content-type': contentType })
  if (request.method === 'HEAD') {
    response.end()
    return
  }

  response.end(body)
})

server.listen(port, '0.0.0.0')
