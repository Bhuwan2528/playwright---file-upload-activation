import fs from "node:fs";
import ExcelJs from 'exceljs'
import { findColumnByAliases, type ExcelHeader } from "../utility/column-helper.js";
import { COLUMN_ALIASES } from "../../config/column-aliases.js";
import path from "node:path";
import { GeneratedFileRename } from "../utility/generated-file-rename.js";

export async function FailedActivationRawFileCreation() {
    
    // Create folder and paths

    const dataFolder = path.join(process.cwd(), 'data');

    const activationFolder = path.join(dataFolder, 'activation');
    const rawFolder = path.join(activationFolder, 'activation-raw-data');
    const failedReportFolder = path.join(activationFolder, 'activation-failed-reports');

    const failedFolder = path.join(dataFolder, 'failed-activation');
    const outputFolder = path.join(failedFolder, 'failed-activation-raw-data');

    // Find original raw Excel file

    const rawFiles = fs.readdirSync(rawFolder).filter(file =>
        !file.startsWith('~$') &&
        file.toLowerCase().endsWith('.xlsx')
    );

    const rawFileName = rawFiles[0];

    if (!rawFileName) {
        throw new Error('Original raw Excel file not found!');
    }

    const rawFilePath = path.join(rawFolder, rawFileName);


    // Find failed activation report
    const failedFiles = fs.readdirSync(failedReportFolder).filter(file =>
        !file.startsWith('~$') &&
        file.toLowerCase().endsWith('.xlsx')
    );

    const failedFileName = failedFiles[0];

    if (!failedFileName) {
        throw new Error('Failed activation report not found!');
    }

    const failedActivationReportPath = path.join(failedReportFolder, failedFileName);

    //check weather they exists or not 
    if (
        !fs.existsSync(rawFilePath) ||
        !fs.existsSync(failedActivationReportPath)
    ) {
        throw new Error('Raw file or Activation Failed file is missing')
    }

    const rawWorkbook = new ExcelJs.Workbook();
    await rawWorkbook.xlsx.readFile(rawFilePath);
    const rawWorksheet = rawWorkbook.worksheets[0];

    if (!rawWorksheet) {
        throw new Error('Raw excel file worksheet doesnt exist')
    }

    const failedWorkbook = new ExcelJs.Workbook()
    await failedWorkbook.xlsx.readFile(failedActivationReportPath)
    const failedWorksheet = failedWorkbook.worksheets[0]

    if (!failedWorksheet) {
        throw new Error('activation failed records excel file worksheet doesnt exist')
    }

    //raw file headers
    const rawHeaders: ExcelHeader[] = []

    rawWorksheet.getRow(1).eachCell((cell, colNumber) => {
        const name = cell.text.trim();

        if (name) {
            rawHeaders.push({
                name,
                column: colNumber
            })
        }
    })

    //failed records file headers
    const failedHeaders: ExcelHeader[] = []

    failedWorksheet.getRow(1).eachCell((cell, colNumber) => {
        const name = cell.text.trim();

        if (name) {
            failedHeaders.push({
                name,
                column: colNumber
            })
        }
    })

    //now find the serial number columns, ki kaha par locate kr rhe hai ye columns 

    const rawSerialColumn = findColumnByAliases(
        rawHeaders,
        'Original Raw Serial Number',
        COLUMN_ALIASES.serialNumber
    );

    const failedSerialColumn = findColumnByAliases(
        failedHeaders,
        'Failed Report Serial Number',
        COLUMN_ALIASES.serialNumber
    );

    //abh hame failed file ke serail number extract krne hai 

    const failedSerialNumbers = new Set<string>()

    failedWorksheet.eachRow((row, rowNumber) => {

        if (rowNumber === 1) {
            return
        }

        const serialNumber = row.getCell(failedSerialColumn).text.trim()

        if (serialNumber) {
            failedSerialNumbers.add(serialNumber)
        }
    })

    if (failedSerialNumbers.size === 0) {
        throw new Error('no failed serial numbers are found while creating failed-activaton-raw file')
    }

    const outputWorkbook = new ExcelJs.Workbook()
    const outputWorksheet = outputWorkbook.addWorksheet('failed-activation')

    const totalRawColumns = rawWorksheet.columnCount

    for (let col = 1; col <= totalRawColumns; col++) {

        const width = rawWorksheet.getColumn(col).width;

        if (width !== undefined) {
            outputWorksheet.getColumn(col).width = width;
        }
    }

    let outputRowNumber = 1;
    const matchedSerialNumbers = new Set<string>();

    rawWorksheet.eachRow((row, rowNumber) => {

        if (rowNumber !== 1) {
            const serialNumber = row.getCell(rawSerialColumn).text.trim()

            if (!failedSerialNumbers.has(serialNumber)) {
                return
            }
            matchedSerialNumbers.add(serialNumber)
        }

        //copy complete row

        const outputRow = outputWorksheet.getRow(outputRowNumber)
        outputRow.height = row.height

        for (let col = 1; col <= totalRawColumns; col++) {

            const sourceCell = row.getCell(col);
            const targetCell = outputRow.getCell(col)

            targetCell.style = sourceCell.style;
            targetCell.value = sourceCell.value

        }

        outputRowNumber++
    })

    const totalMatchedRecords = outputRowNumber - 2;

    if (totalMatchedRecords === 0) {
        throw new Error('No matching records found in original raw file!');
    }



    // Generate output filename
    const originalFileName = path.parse(rawFilePath).name;

    const fileName = GeneratedFileRename(
        originalFileName,
        'filtered-FANR-file'
    );

    const outputPath = path.join(outputFolder, fileName);

    // Save new raw Excel file
    await outputWorkbook.xlsx.writeFile(outputPath);

    console.log('--------------------------------');
    console.log('Failed Activation Raw File Created!');
    console.log('Failed serial numbers:', failedSerialNumbers.size);
    console.log('Matched records:', totalMatchedRecords);
    console.log('Unmatched serial numbers:', failedSerialNumbers.size - matchedSerialNumbers.size);
    console.log('Saved at:', outputPath);
    console.log('--------------------------------');

    return outputPath;
}