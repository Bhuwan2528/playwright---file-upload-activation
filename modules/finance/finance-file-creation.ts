import fs from "node:fs";
import path from "node:path";
import ExcelJs from 'exceljs'
import type { FinanceTemplate } from "../../schema/finance-schemas/finance-template.js";
import { formatDate_DDMMYYYY } from "../utility/format-date.js";
import { GeneratedFileRename } from "../utility/generated-file-rename.js";
import { FINANCE_PARTNERS } from "../../config/finance-partner.js";
import { findColumnByAliases, type ExcelHeader } from "../utility/column-helper.js";
import { COLUMN_ALIASES } from "../../config/column-aliases.js";
import { ShowFileReviewModal } from "../utility/file-review-modal.js";
import type { Page } from "playwright";

export async function FinanceFileCreation(page: Page){

    // Folder paths
    const dataFolder = path.join(process.cwd(), 'data')
    const activationFolder = path.join(dataFolder, 'activation')
    const rawFolder = path.join(activationFolder, 'activation-raw-data');

    const financeFolder = path.join(dataFolder, 'finance')
    const outputFolder = path.join(financeFolder, 'finance-data');

    fs.mkdirSync(outputFolder, { recursive: true });

    const files = fs.readdirSync(rawFolder).filter(file =>
        !file.startsWith('~$') &&
        file.toLowerCase().endsWith('.xlsx')
    );

    const rawFileName = files[0];

    if(!rawFileName){
        throw new Error('file not found in activation raw folder')
    }

    const rawFile = path.join(rawFolder, rawFileName)

    const workbook = new ExcelJs.Workbook()
    await workbook.xlsx.readFile(rawFile)

    const worksheet = workbook.worksheets[0]
    if(!worksheet){
        throw new Error('worksheet not found')
    }

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

    const outputRows : FinanceTemplate[] = []

    const serialNumberColumn = findColumnByAliases(
        headers,
        'Serial Number',
        COLUMN_ALIASES.serialNumber
    )

    const financeByColumn = findColumnByAliases(
        headers,
        'Finance By',
        COLUMN_ALIASES.financeBy
    )

    const financeOn = findColumnByAliases(
        headers,
        'Finance Created Date',
        COLUMN_ALIASES.financeCreatedDate
    )

    // Validate columns
    if (
        serialNumberColumn === undefined ||
        financeByColumn === undefined ||
        financeOn === undefined
    ) {
        throw new Error('Required Excel columns are missing!');
    }

    worksheet.eachRow((row, rowNumber)=>{

        if(rowNumber === 1) return;

        const serial_number_primary = row.getCell(serialNumberColumn).text.trim();

        const finance_partner_name = row.getCell(financeByColumn).text.trim();
        const financed_on = row.getCell(financeOn).value;

        // Skip records without finance details

        if (!serial_number_primary) {
            throw new Error(`Serial number missing at row ${rowNumber}`);
        }

        if (
            !finance_partner_name ||
            financed_on === null ||
            financed_on === undefined ||
            (typeof financed_on === 'string' && !financed_on.trim())
        ) {
            return;
        }
        
        const finance_partner_code = FINANCE_PARTNERS[finance_partner_name]

        if(!finance_partner_code){
            throw new Error(`finance partner code not found of ${finance_partner_name}`)
        }


        outputRows.push({
            serial_number_primary,
            finance_partner_code,
            financed_on : formatDate_DDMMYYYY(financed_on)
        })
        
    })
    

    const outputWorkbook = new ExcelJs.Workbook();
    const outputWorksheet = outputWorkbook.addWorksheet('finance')

    outputWorksheet.columns = [
        { header: 'serial_number_primary', key: 'serial_number_primary', width: 25 },
        { header: 'finance_partner_code', key: 'finance_partner_code', width: 30 },
        { header: 'financed_on', key: 'financed_on', width: 25 },
    ]

    outputWorksheet.addRows(outputRows)

    const rawFileOrignalName = path.parse(rawFile).name
    const outputFileName = GeneratedFileRename(rawFileOrignalName, 'finance')

    const outputFilePath = path.join(outputFolder, outputFileName)
    await outputWorkbook.xlsx.writeFile(outputFilePath)
    

    console.log('--------------------------------');
    console.log('Excel created successfully!');
    console.log('Total records:', outputRows.length);
    console.log('Saved at:', outputFilePath);
    console.log('--------------------------------');


    
    await ShowFileReviewModal(page, outputFilePath, "Finance File Created!");

    return outputFilePath;
}