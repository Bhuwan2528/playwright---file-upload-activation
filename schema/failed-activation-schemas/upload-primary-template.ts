
export interface UploadPrimaryTemplate {
    product_sku: string;
    serial_number_primary: string;
    serial_number_secondary: string;
    ZD_Code: string;
    invoice_number: string;
    'invoice_date (dd-mm-yyyy)': string;
    is_demo: boolean;
    is_one_time_benefit: boolean;
}
