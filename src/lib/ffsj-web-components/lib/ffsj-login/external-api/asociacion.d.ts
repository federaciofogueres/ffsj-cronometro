/**
 * Censo Hogueras
 * Censo-Hogueras
 *
 * OpenAPI spec version: 1.0.0
 * Contact: you@your-company.com
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */
export interface Asociacion {
    [key: string]: any;
    /**
     * Identificador único de la asociación.
     */
    id: number;
    /**
     * Nombre de la asociación.
     */
    nombre: string;
    /**
     * CIF de la asociación.
     */
    cif: string;
    /**
     * Dirección postal de la asociación.
     */
    direccion?: string;
    /**
     * Lema de la asociación.
     */
    lema?: string;
    /**
     * Año de fundación de la asociación.
     */
    anyoFundacion?: number;
    /**
     * Correo electrónico de contacto de la asociación.
     */
    email: string;
    /**
     * Contraseña de acceso al sistema para la asociación.
     */
    password?: string;
    /**
     * Número de teléfono de contacto de la asociación.
     */
    telefono?: string;
    /**
     * Código numérico que representa el tipo de asociación.
     */
    tipoAsociacion: number;
    /**
     * Indica si el componente está activo o no.
     */
    active?: number;
    /**
     * Imagen que tiene la asociación.
     */
    img?: string;
}