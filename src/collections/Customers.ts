import type { CollectionConfig } from 'payload'
import Razorpay from 'razorpay'
import { sendEmail } from '../lib/sendEmail'

// Every paying customer from Design My Website's checkout lands here
// automatically (created the moment /api/verify-payment succeeds), mirroring
// their package/purchase/expiry dates. Admins can also add a customer here
// manually — e.g. to attach them to an Inactive (not publicly purchasable)
// package and send them a custom payment link — and the same expiry-reminder
// engine (see ExpiryReminders) applies either way.
export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Customer', plural: 'Customers' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'package', 'purchaseDate', 'expiryDate', 'source'],
    group: 'Sales',
    description: 'Auto-created for every paid checkout. You can also add one manually and attach any package (including Inactive ones) to send a custom payment link.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user), // manual creation by an admin; auto-creation uses the local API, which bypasses access
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text', required: true },
    { name: 'package', type: 'relationship', relationTo: 'products', required: true, label: 'Package' },
    { name: 'purchaseDate', type: 'date', required: true },
    { name: 'expiryDate', type: 'date', required: true },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: 'Checkout (auto-created)', value: 'checkout' },
        { label: 'Manually Added', value: 'manual' },
      ],
      admin: { readOnly: true },
    },
    { name: 'order', type: 'relationship', relationTo: 'orders', admin: { readOnly: true, description: 'The paid Order that created this customer, if any.' } },
    {
      name: 'remindersSent',
      type: 'select',
      hasMany: true,
      admin: { hidden: true },
      options: [
        { label: '7 Days Before', value: '7d' },
        { label: '3 Days Before', value: '3d' },
        { label: 'On Expiry Day', value: '0d' },
      ],
    },
    {
      name: 'sendPaymentLinkNow',
      type: 'checkbox',
      defaultValue: false,
      label: 'Send Payment Link',
      admin: {
        description: 'Check this and Save to generate a Razorpay Payment Link for this customer\'s package price and email it to them. Resets to unchecked automatically once sent — check it again any time to send a fresh link.',
      },
    },
    { name: 'paymentLinkUrl', type: 'text', admin: { readOnly: true, description: 'The hosted Razorpay payment page URL last sent to this customer.' } },
    { name: 'paymentLinkId', type: 'text', admin: { readOnly: true } },
    {
      name: 'paymentLinkStatus',
      type: 'select',
      admin: { readOnly: true },
      options: [
        { label: 'Created (awaiting payment)', value: 'created' },
        { label: 'Paid', value: 'paid' },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req, operation, context }) => {
        if (operation !== 'update' || !originalDoc || context?.internalPaymentFlow) return data
        if (!data.sendPaymentLinkNow || originalDoc.sendPaymentLinkNow) return data // only fires on the true transition, not every save

        const key_id = process.env.RAZORPAY_KEY_ID
        const key_secret = process.env.RAZORPAY_KEY_SECRET
        if (!key_id || !key_secret) {
          throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not configured — cannot create a payment link.')
        }

        const pkg = await req.payload.findByID({ collection: 'products', id: data.package ?? originalDoc.package })
        if (!pkg) throw new Error('This customer has no package attached — attach one before sending a payment link.')

        const client = new Razorpay({ key_id, key_secret })
        const paymentLink = await client.paymentLink.create({
          amount: Math.round(pkg.price * 100),
          currency: 'INR',
          description: `${pkg.name} — Nexovah Technology`,
          customer: {
            name: data.name ?? originalDoc.name,
            email: data.email ?? originalDoc.email,
            contact: data.phone ?? originalDoc.phone,
          },
          notify: { sms: false, email: false }, // we send our own branded email below
          reference_id: `CUST-${originalDoc.id}-${Date.now()}`,
        })

        const template = await req.payload
          .find({ collection: 'campaign-templates', where: { name: { equals: 'Custom Payment Link Template' } }, limit: 1 })
          .then((res) => res.docs[0])

        const html = (template?.rawHtml || DEFAULT_PAYMENT_LINK_HTML)
          .replace(/\{\{\s*customer_name\s*\}\}/gi, String(data.name ?? originalDoc.name))
          .replace(/\{\{\s*package_name\s*\}\}/gi, pkg.name)
          .replace(/\{\{\s*amount\s*\}\}/gi, `₹${pkg.price.toLocaleString('en-IN')}`)
          .replace(/\{\{\s*payment_link_url\s*\}\}/gi, paymentLink.short_url)

        await sendEmail(req.payload, {
          to: data.email ?? originalDoc.email,
          subject: `Complete your payment — ${pkg.name} — Nexovah Technology`,
          html,
        })

        return {
          ...data,
          sendPaymentLinkNow: false,
          paymentLinkUrl: paymentLink.short_url,
          paymentLinkId: paymentLink.id,
          paymentLinkStatus: 'created',
        }
      },
    ],
  },
}

const DEFAULT_PAYMENT_LINK_HTML = `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">
    <style>
      body { background-color: #F0F1F3; font-family: 'Helvetica Neue', 'Segoe UI', Helvetica, sans-serif; font-size: 15px; line-height: 26px; margin: 0; color: #444; }
      .wrap { background-color: #fff; padding: 30px; max-width: 525px; margin: 0 auto; border-radius: 5px; text-align: center; }
      h1 { color: #101010; font-size: 22px; }
      .btn { display: inline-block; margin-top: 20px; padding: 14px 32px; background: linear-gradient(90deg, #196d54 0%, #00d45f 100%); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Hi {{customer_name}}, complete your payment</h1>
      <p>{{package_name}} — <strong>{{amount}}</strong></p>
      <a class="btn" href="{{payment_link_url}}">Pay Now</a>
      <p style="margin-top:24px; color:#6b6b6b; font-size:13px;">
        You'll be taken to Razorpay's secure payment page to complete your purchase.
      </p>
    </div>
  </body>
</html>`
