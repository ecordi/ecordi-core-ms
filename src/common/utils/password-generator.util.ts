/**
 * Utilidad para generar contraseñas aleatorias seguras
 */
export class PasswordGenerator {
  /**
   * Genera una contraseña aleatoria con letras, números y símbolos
   * @param length Longitud de la contraseña (por defecto: 10)
   * @returns Contraseña generada
   */
  static generate(length: number = 10): string {
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const specialChars = '!@#$%^&*()-_=+[]{}|;:,.<>?';
    
    const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
    
    // Asegurarse de que la contraseña tenga al menos un carácter de cada tipo
    let password = 
      this.getRandomChar(uppercaseChars) +
      this.getRandomChar(lowercaseChars) +
      this.getRandomChar(numberChars) +
      this.getRandomChar(specialChars);
    
    // Completar el resto de la contraseña con caracteres aleatorios
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(allChars);
    }
    
    // Mezclar los caracteres para que no siempre siga el mismo patrón
    return this.shuffleString(password);
  }
  
  /**
   * Obtiene un carácter aleatorio de una cadena
   */
  private static getRandomChar(characters: string): string {
    return characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  /**
   * Mezcla los caracteres de una cadena
   */
  private static shuffleString(str: string): string {
    const array = str.split('');
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
  }
}
