import fs from "node:fs";
import path from "node:path";
import ExcelJs from 'exceljs'
import { findColumnByAliases, type ExcelHeader } from "../../utility/column-helper.js";
import type { StockImportTemplate } from "../../../schema/failed-activation-schemas/stock-import-template.js";
import { COLUMN_ALIASES } from "../../../config/column-aliases.js";
import { GeneratedFileRename } from "../../utility/generated-file-rename.js";

export async function StockImportFileCreation(){

    //folders and file paths 

    const dataFolder = path.join(process.cwd(), 'data')

    const failedActivationFolder = path.join(dataFolder, 'failed-activation')
    const faRawFolder = path.join(failedActivationFolder, 'failed-activation-raw-data')

    const outputFolder = path.join(failedActivationFolder, 'stock-import')

    const failedRawFiles = fs.readdirSync(faRawFolder).filter(file =>
        !file.startsWith('~$') &&
        (file.endsWith('.xlsx') || file.endsWith('.csv'))
    )

    const failedRawFileName = failedRawFiles[0]

    if (!failedRawFileName) {
        throw new Error('Original raw Excel file not found!');
    }

    const failedRawFilePath = path.join(faRawFolder, failedRawFileName)

    const rawWorkbook = new ExcelJs.Workbook()
    await rawWorkbook.xlsx.readFile(failedRawFilePath)
    const rawWorksheet = rawWorkbook.worksheets[0]

    if(!rawWorksheet){
        throw new Error('failed activation records Raw Excel file worksheet not found!');
    }

    //extract headers
    const headers: ExcelHeader[] = []

    rawWorksheet.getRow(1).eachCell((col, colNumber)=>{
        const name = col.text.trim()

        if(name){
            headers.push({
                name,
                column: colNumber
            })
        }
    })

    //store transform records
    const outputRows: StockImportTemplate[] = []

    const skuCodeColumn = findColumnByAliases(
        headers,
        'SKU code',
        COLUMN_ALIASES.SKUCode
    )

    const serialNumberColumn = findColumnByAliases(
        headers,
        'Serial Number',
        COLUMN_ALIASES.serialNumber
    )

    if (
        !skuCodeColumn ||
        !serialNumberColumn
    ) {
        throw new Error('Required Excel columns are missing!');
    }

    rawWorksheet.eachRow((row, rowNumber) => {

        if(rowNumber === 1){
            return
        }

        const product_sku = row.getCell(skuCodeColumn).text.trim()
        const serial_number_primary = row.getCell(serialNumberColumn).text.trim();
        const serial_number_secondary = serial_number_primary;

        outputRows.push({
            warehouse_code: '',
            pallet_sn: '',
            outer_box_sn: '',
            product_sku,
            serial_number_primary,
            serial_number_secondary,
        })
    })

    const outputWorkbook = new ExcelJs.Workbook()
    const outputWorksheet = outputWorkbook.addWorksheet('stock-import')

    outputWorksheet.columns =[
        {header: 'warehouse_code', key: 'warehouse_code', width: 20 },
        {header: 'pallet_sn', key: 'pallet_sn', width: 20 },
        {header: 'outer_box_sn', key: 'outer_box_sn', width: 20 },
        {header: 'product_sku', key: 'product_sku', width: 20 },
        {header: 'serial_number_primary', key: 'serial_number_primary', width: 30 },
        {header: 'serial_number_secondary', key: 'serial_number_secondary', width: 30 },
    ]

    outputWorksheet.addRows(outputRows)

    const rawFileOrignalName = path.parse(failedRawFilePath).name;
    const outputFileName = GeneratedFileRename(rawFileOrignalName, 'stock-import')

    const outputPath = path.join(outputFolder, outputFileName);

    // Save Excel file
    await outputWorkbook.xlsx.writeFile(outputPath);

    console.log('--------------------------------');
    console.log('Stock Import Excel Created!');
    console.log('Total records:', outputRows.length);
    console.log('Saved at:', outputPath);
    console.log('--------------------------------');

    return outputPath;

}