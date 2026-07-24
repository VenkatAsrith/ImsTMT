const Razorpay = require('razorpay');

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

const isMockMode = !keyId || !keySecret || keyId.startsWith('rzp_test_placeholder');

if (isMockMode) {
  console.log('⚡ Razorpay Service running in: MOCK FALLBACK MODE');
} else {
  console.log('💳 Razorpay Service running in: LIVE MODE');
}

/**
 * Generates a payment link for a payment invoice.
 * If in mock mode, it returns a local simulated payment page URL.
 * 
 * @param {object} payment Payment document
 * @param {object} student Student document
 * @param {object} req Express request to derive protocol and host
 * @returns {Promise<object>} Returns { id, short_url, status }
 */
const createPaymentLink = async (payment, student, req) => {
  const protocol = req.protocol;
  const host = req.get('host');

  if (isMockMode) {
    const mockUrl = `${protocol}://${host}/api/payments/razorpay-mock/pay/${payment._id}`;
    return {
      id: `plink_mock_${Math.random().toString(36).substring(2, 10)}`,
      short_url: mockUrl,
      status: 'created'
    };
  }

  try {
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const description = `Tuition Fee Payment for ${student.name} - Invoice ${payment.referenceNumber}`;
    
    // Sanitize phone number (strip non-digits and add country code prefix if needed)
    let cleanPhone = student.phone ? student.phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const payload = {
      amount: Math.round(payment.amount * 100), // Razorpay accepts in paisa (1 INR = 100 Paisa)
      currency: 'INR',
      accept_partial: false,
      reference_id: payment.referenceNumber,
      description,
      customer: {
        name: student.name,
        email: student.email,
        contact: cleanPhone || '917993442607'
      },
      notify: {
        sms: false,
        email: false
      },
      reminder_enable: true,
      callback_url: `${protocol}://${host}/api/payments/razorpay-callback`,
      callback_method: 'get'
    };

    const link = await razorpay.paymentLink.create(payload);

    return {
      id: link.id,
      short_url: link.short_url,
      status: link.status
    };
  } catch (err) {
    console.error('❌ Razorpay Link Creation Error:', err.message);
    throw new Error(`Razorpay Link Creation Failed: ${err.message}`);
  }
};

module.exports = {
  createPaymentLink,
  isMockMode: () => isMockMode
};
