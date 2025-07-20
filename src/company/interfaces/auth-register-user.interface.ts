/**
 * Interfaz para el mensaje de registro de usuario en auth-ms
 */
export interface AuthRegisterUserPayload {
  email: string;
  password: string;
  name: string;
  companyId: string;
  role: string;
  mustChangePassword: boolean;
  passwordExpiresAt: string;
}
