import axios from 'axios';

export default async function sendEmails(to, mensaje, subject) {
    try {
        if (!subject) {
            throw new Error('Subject field is missing or empty');
        }

        // Resend espera un solo destinatario en "to", pero puedes enviar varios usando una coma
        const recipients = Array.isArray(to) ? to.join(',') : to;

        const response = await axios.post(
            'https://api.resend.com/emails',
            {
                from: 'EquipoNotificaciones <onboarding@resend.dev>',
                to: recipients,
                subject,
                html: `<p>${mensaje}</p>`
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer re_bL3krgv7_Aa9TEAdyNDPiRdhebWoqwu4e'
                },
            }
        );

        if (response.status !== 200 && response.status !== 202) {
            throw new Error('Failed to send emails');
        }

        console.log('Emails sent successfully:', response.data);
    } catch (error) {
        console.error('Error sending emails:', error.message);
    }
}
