import { Injectable } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
      tls: {
        //Desactiva la validación del certificado del servidor para el funcionamiento de las pruebas cuando no se esta en produccion.
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    })
  }

  async sendVerificationCode(
    email: string,
    name: string,
    code: string,
    reason: string,
    customSubject?: string, // Parámetro opcional para el título
  ) {
    const html = this.getVerificationCodeTemplate(name, code, reason)
    try {
      await this.transporter.sendMail({
        from: `Solinal <${process.env.MAIL_USER}>`,
        to: email,
        subject: customSubject || 'Confirmación de Correo Electrónico',
        html,
      })
      console.log(`Verification code sent to ${email}`)
    } catch (error) {
      console.error(`Failed to send email: ${error}`)
      throw new Error('Failed to send verification code')
    }
  }

  private getVerificationCodeTemplate(
    name: string,
    code: string,
    reason: string,
  ): string {
    const headerTitle = reason || 'Verificación de Correo Electrónico'
    return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${headerTitle}</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #f7f9fc;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
          }
          .email-container {
            max-width: 600px;
            margin: 30px auto;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .email-header {
            background-color: #051e46;
            padding: 25px;
            text-align: center;
          }
          .email-header h1 {
            margin: 0;
            font-size: 28px;
            color: #ffffff;
          }
          .email-body {
            padding: 40px 30px;
            text-align: center;
          }
          .email-body p {
            line-height: 1.6;
            font-size: 16px;
            margin: 0 0 20px;
          }
          .code-box {
            background-color: #f0f0f0;
            color: #051e46;
            font-size: 24px;
            padding: 15px 20px;
            border: 2px dashed #051e46;
            border-radius: 5px;
            display: inline-block;
            letter-spacing: 2px;
            margin: 20px 0;
          }
          .email-footer {
            background-color: #f4f4f7;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #051e46;
            border-top: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h1>${headerTitle}</h1>
          </div>
          <div class="email-body">
            <p>Hola ${name},</p>
            <p>Te enviamos este código para que puedas ${reason.toLowerCase()}:</p>
            <div class="code-box">
              ${code}
            </div>
            <p>Este código es válido por <strong>10 minutos</strong>.</p>
            <p>Si no solicitaste este código, ignora este mensaje.</p>
          </div>
          <div class="email-footer">
            &copy; ${new Date().getFullYear()} Solinal. Todos los derechos reservados.
          </div>
        </div>
      </body>
    </html>
    `
  }

  async sendInvoiceEmail(email: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: `Solinal <${process.env.MAIL_USER}>`,
        to: email,
        subject,
        html,
      })
      return true
    } catch (error) {
      throw new Error('Failed to send invoice email')
    }
  }
}
