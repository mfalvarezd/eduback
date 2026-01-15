import 'dotenv/config'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined')
}

const createNewCustomer = async (email, metadata) => {
  try {
    if (!email || !metadata) {
      throw new Error('Missing required customer information')
    }

    const customer = await stripe.customers.create({
      email,
      metadata,
    })

    return customer
  } catch (error) {
    throw new Error(`Failed to create new customer: ${error.message}`)
  }
}

const createCheckoutSession = async (
  stripeCustomerId,
  priceId,
  userId,
  period,
  productType,
  userCount,
) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: userCount }],
      mode: 'subscription',
      success_url: `${frontendUrl}/plans/cuenta?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/cuenta?cancelled=true`,
      metadata: { userId, period, productType },

      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    })

    return session
  } catch (error) {
    console.log(
      `Error creating checkout session: ${error.message}`,
      stripeCustomerId,
      priceId,
      userId,
      period,
      productType,
      userCount,
    )
    throw new Error(`Failed to create checkout session: ${error.message}`)
  }
}
const retrieveSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return subscription
  } catch (error) {
    throw new Error(`Failed to retrieve subscription: ${error.message}`)
  }
}

export { createNewCustomer, createCheckoutSession, retrieveSubscription }
