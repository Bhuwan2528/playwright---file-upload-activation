
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import type { ActivationTemplate } from '../../schema/activation-schemas/activation-template.js';
import { formatDate_DDMMYYYY } from '../utility/format-date.js';
import { GeneratedFileRename } from '../utility/generated-file-rename.js';
import { findColumnByAliases, type ExcelHeader } from '../utility/column-helper.js';
import { COLUMN_ALIASES } from '../../config/column-aliases.js';

export async function ActivationFileCreation() {

    // Folder paths
    const dataFolder = path.join(process.cwd(), 'data')
    const activationFolder = path.join(dataFolder, 'activation')
    const rawFolder = path.join(activationFolder, 'activation-raw-data');
    const outputFolder = path.join(activationFolder, 'activation-data');

    // Create output folder
    fs.mkdirSync(outputFolder, { recursive: true });

    // Find Excel file
    const files = fs.readdirSync(rawFolder).filter(file =>
        !file.startsWith('~$') &&
        file.toLowerCase().endsWith('.xlsx')
    );

    if (files.length === 0) {
        throw new Error('Raw Excel file not found!');
    }

    // First Excel file select
    const rawFileName = files[0];

    if (!rawFileName) {
        throw new Error('Raw Excel file not found!');
    }

    const rawFile = path.join(rawFolder, rawFileName);

    // Read Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(rawFile);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
        throw new Error('Excel worksheet not found!');
    }

    // Get column names and their positions
    const headers: ExcelHeader[] = []

    worksheet.getRow(1).eachCell((cell, colNumber)=>{
        const name = cell.text.trim()

        if(name){
            headers.push({
                name,
                column: colNumber
            })
        }
    })

    // Store transformed records
    const outputRows: ActivationTemplate[] = [];

        const skuCodeColumn = findColumnByAliases(
            headers,
            'SKU Code',
            COLUMN_ALIASES.SKUCode
        )

        const serialNumberColumn = findColumnByAliases(
            headers,
            'Serial Number',
            COLUMN_ALIASES.serialNumber
        )

        const activationDateColumn = findColumnByAliases(
            headers,
            'Activation Date',
            COLUMN_ALIASES.tertiaryDate
        )
        if (
            !skuCodeColumn || 
            !serialNumberColumn || 
            !activationDateColumn
        ) {
            throw new Error('Required Excel columns are missing!');
        }

    // Read every Excel row
    worksheet.eachRow((row, rowNumber) => {

        // Skip header row
        if (rowNumber === 1) return;

        const sku_code = row.getCell(skuCodeColumn).text.trim();
        const serial_number_primary = row.getCell(serialNumberColumn).text.trim();
        const serial_number_secondary = serial_number_primary;
        const activationDate = row.getCell(activationDateColumn).value;

        // Create output object
        outputRows.push({
            sku_code,
            serial_number_primary,
            serial_number_secondary,
            'activated_on_date (dd-mm-yyyy)': formatDate_DDMMYYYY(activationDate),
            operator: '',
            country: 'India',
            state: '',
            city: ''
        });

    });

    // Create new Excel workbook
    const outputWorkbook = new ExcelJS.Workbook();

    const outputSheet = outputWorkbook.addWorksheet('Activations');

    // Define output columns
    outputSheet.columns = [
        { header: 'sku_code', key: 'sku_code', width: 20 },
        { header: 'serial_number_primary', key: 'serial_number_primary', width: 25 },
        { header: 'serial_number_secondary', key: 'serial_number_secondary', width: 25 },
        { header: 'activated_on_date (dd-mm-yyyy)', key: 'activated_on_date (dd-mm-yyyy)', width: 30 },
        { header: 'operator', key: 'operator', width: 15 },
        { header: 'country', key: 'country', width: 15 },
        { header: 'state', key: 'state', width: 15 },
        { header: 'city', key: 'city', width: 15 }
    ];

    // Add transformed records
    outputSheet.addRows(outputRows);

    // Save output Excel
    const rawFileOrignalName = path.parse(rawFile).name
    const outputFileName = GeneratedFileRename(rawFileOrignalName, 'activation')

    const outputPath = path.join(outputFolder, outputFileName);

    await outputWorkbook.xlsx.writeFile(outputPath);

    console.log('--------------------------------');
    console.log('Excel created successfully!');
    console.log('Total records:', outputRows.length);
    console.log('Saved at:', outputPath);
    console.log('--------------------------------');

    return outputPath
    
}
