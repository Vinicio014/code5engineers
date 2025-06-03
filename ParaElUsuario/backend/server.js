const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'correo@gmail.com',   
        pass: 'patito1122',  
    },
});

app.post('/send-email', (req, res) => {
    const { nombre, email, telefono, mensaje } = req.body;

    let mailOptions = {
        from: 'correo@gmail.com',  
        to: 'correo2@gmail.com',  
        subject: `Mensaje de ${nombre} - Tel: ${telefono}`,
        text: `Has recibido un nuevo mensaje:\n\nNombre: ${nombre}\nTeléfono: ${telefono}\nCorreo electrónico: ${email}\n\nMensaje:\n${mensaje}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error al enviar el correo:', error);
            return res.status(500).send({ message: 'Error al enviar el correo', error });
        }
        console.log('Correo enviado:', info.response);
        res.status(200).send({ message: 'Correo enviado correctamente' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
