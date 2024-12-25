const nodemailer = require('nodemailer');

const sendEmail = async (mailOptions) => {
    try {
        const transporter = nodemailer.createTransport({
            service: process.env.NODEMAILER_SERVICE,
            auth: {
                user: process.env.NODEMAILER_USERNAME,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        const response = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
        return response;
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

module.exports = sendEmail;
