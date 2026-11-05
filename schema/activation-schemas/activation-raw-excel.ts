
export type ExcelTextValue = string | number | null;

export type ExcelDateValue = string | number | Date | null;

export interface ActivationRawExcelSchema {

    // RSM Details
    "RSM Name": ExcelTextValue;
    "RSM Code": ExcelTextValue;

    // SH Details
    "SH Name": ExcelTextValue;
    "SH Code": ExcelTextValue;

    // Product Details
    "ModelName": ExcelTextValue;
    "SKUCode": ExcelTextValue;
    "SerialNumber1": string | null;

    // RDS Details
    "RDS Name": ExcelTextValue;
    "RDS State": ExcelTextValue;

    // Primary Sale Details
    "Primary Sale date": ExcelDateValue;
    "PrimaryInvoice": ExcelTextValue;
    "Primary To Code": ExcelTextValue;
    "Primary To": ExcelTextValue;

    // Intermediary Sale Details
    "Intermediary Sale date": ExcelDateValue;
    "IntermediaryInvoice": ExcelTextValue;
    "Intermediary To Code": ExcelTextValue;
    "Intermediary To": ExcelTextValue;

    // Secondary Sale Details
    "Secondary From Code": ExcelTextValue;
    "Secondary From": ExcelTextValue;
    "Secondary Sale Date": ExcelDateValue;
    "SecondaryInvoice": ExcelTextValue;

    // Retailer Details
    "Retailer Code": ExcelTextValue;
    "Retailer Name": ExcelTextValue;
    "Retailer State": ExcelTextValue;

    // Activation Details
    "Web Activation date": ExcelDateValue;
    "Tertiary Considered For Date": ExcelDateValue;

    // Current Distributor Details
    "Current ND Code": ExcelTextValue;
    "Current ND Name": ExcelTextValue;

    // Finance Details
    "Finance By": ExcelTextValue;
    "FinanceRequestedDate": ExcelDateValue;
    "FinanceCreatedDate": ExcelDateValue;

    // Product Information
    "Currency": ExcelTextValue;
    "ProductName": ExcelTextValue;
    "BrandName": ExcelTextValue;
    "ColorName": ExcelTextValue;
    "ModelCode": ExcelTextValue;
    "SKUName": ExcelTextValue;
    "SKUDescription": ExcelTextValue;

    // ISP Details
    "ISPName": ExcelTextValue;
    "ISPCode": ExcelTextValue;

    // Stock Details
    "StockBinType": ExcelTextValue;

}
