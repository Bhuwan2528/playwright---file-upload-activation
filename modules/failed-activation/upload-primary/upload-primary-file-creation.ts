
import fs from "node:fs";
import path from "node:path";
import ExcelJs from "exceljs";
import { findColumnByAliases, type ExcelHeader } from "../../utility/column-helper.js";
import { COLUMN_ALIASES } from "../../../config/column-aliases.js";
import type { UploadPrimaryTemplate } from "../../../schema/failed-activation-schemas/upload-primary-template.js";
import { formatDate_DDMMYYYY } from "../../utility/format-date.js";
import { GeneratedFileRename } from "../../utility/generated-file-rename.js";

export async function UploadPrimaryFileCreation() {

    //folders and file paths 

    const dataFolder = path.join(process.cwd(), 'data')
    const failedActivationFolder = path.join(dataFolder, 'failed-activation')
    const faRawFolder = path.join(failedActivationFolder, 'failed-activation-raw-data')
    const outputFolder = path.join(failedActivationFolder, 'upload-primary')

    const failedRawFiles = fs.readdirSync(faRawFolder).filter(file =>
        !file.startsWith('~$') &&
        (file.endsWith('.xlsx') || file.endsWith('.csv'))
    )

    const failedRawFileName = failedRawFiles[0]

    if (!failedRawFileName) {
        throw new Error('Original raw Excel file not found!');
    }

    const failedRawFilePath = path.join(faRawFolder, failedRawFileName)

    // Read failed activation raw file
    const workbook = new ExcelJs.Workbook();
    await workbook.xlsx.readFile(failedRawFilePath);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
        throw new Error('Failed activation worksheet not found!');
    }

    // Extract headers
    const headers: ExcelHeader[] = [];

    worksheet.getRow(1).eachCell((cell, colNumber) => {
        const name = cell.text.trim();

        if (name) {
            headers.push({
                name,
                column: colNumber
            });
        }
    });

    // Find required columns
    const skuCodeColumn = findColumnByAliases(
        headers,
        'SKU Code',
        COLUMN_ALIASES.SKUCode
    );

    const serialNumberColumn = findColumnByAliases(
        headers,
        'Serial Number',
        COLUMN_ALIASES.serialNumber
    );

    const zdCodeColumn = findColumnByAliases(
        headers,
        'ZD Code',
        COLUMN_ALIASES.primaryToCode
    );

    const invoiceNumberColumn = findColumnByAliases(
        headers,
        'Primary Invoice',
        COLUMN_ALIASES.primaryInvoice
    );

    const invoiceDateColumn = findColumnByAliases(
        headers,
        'Primary Sale Date',
        COLUMN_ALIASES.primarySaleDate
    );

    // Store Upload Primary records
    const outputRows: UploadPrimaryTemplate[] = [];

    const zdCodes = new Set<string>();
    let minimumInvoiceYear = Infinity;

    // Read every row
    worksheet.eachRow((row, rowNumber) => {

        if (rowNumber === 1) return;

        const product_sku = row.getCell(skuCodeColumn).text.trim();
        const serial_number_primary = row.getCell(serialNumberColumn).text.trim();

        const ZD_Code = row.getCell(zdCodeColumn).text.trim();
        const invoice_number = row.getCell(invoiceNumberColumn).text.trim();

        const invoiceDate = row.getCell(invoiceDateColumn).value;
        const invoice_date = formatDate_DDMMYYYY(invoiceDate);

        // Skip rows without SKU or serial number
        if (!product_sku || !serial_number_primary) return;

        // Check required primary details
        if (!ZD_Code || !invoice_number || !invoice_date) {
            throw new Error(`Primary details missing at row ${rowNumber}!`);
        }

        // Store unique ZD Codes
        zdCodes.add(ZD_Code);

        // Find minimum invoice year by splitting dd-mm-yyyy => yyyy
        const invoiceYear = Number(invoice_date.split('-')[2]);


        outputRows.push({
            product_sku,
            serial_number_primary,
            serial_number_secondary: serial_number_primary,
            ZD_Code,
            invoice_number,
            'invoice_date (dd-mm-yyyy)': invoice_date,
            is_demo: false,
            is_one_time_benefit: false
        });

    });

    if (outputRows.length === 0) {
        throw new Error('No valid records found for Upload Primary!');
    }

    // Create output Excel
    const outputWorkbook = new ExcelJs.Workbook();

    const outputWorksheet = outputWorkbook.addWorksheet('Upload Primary');

    // Define columns
    outputWorksheet.columns = [
        { header: 'product_sku', key: 'product_sku', width: 20 },
        { header: 'serial_number_primary', key: 'serial_number_primary', width: 25 },
        { header: 'serial_number_secondary', key: 'serial_number_secondary', width: 25 },
        { header: 'ZD_Code', key: 'ZD_Code', width: 20 },
        { header: 'invoice_number', key: 'invoice_number', width: 25 },
        { header: 'invoice_date (dd-mm-yyyy)', key: 'invoice_date (dd-mm-yyyy)', width: 30 },
        { header: 'is_demo', key: 'is_demo', width: 15 },
        { header: 'is_one_time_benefit', key: 'is_one_time_benefit', width: 25 }
    ];

    // Add records
    outputWorksheet.addRows(outputRows);

    // Generate filename
    const originalFileName = path.parse(failedRawFilePath).name;

    const fileName = GeneratedFileRename(
        originalFileName,
        'upload-primary'
    );

    const outputPath = path.join(outputFolder, fileName);

    // Save Excel file
    await outputWorkbook.xlsx.writeFile(outputPath);

    console.log('--------------------------------');
    console.log('Upload Primary Excel Created!');
    console.log('Total records:', outputRows.length);
    console.log('Saved at:', outputPath);
    console.log('--------------------------------');

    return outputPath;
}
