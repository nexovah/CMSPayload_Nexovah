import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: 'localhost' }],
  },
  devIndicators: {
    position: 'bottom-right',
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
