export function GeneratedFileRename( fileName: string, additionalName: string ) {

    const date = new Date();

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const formattedDate = `${day}-${month}-${year}`;

    return `${fileName}-( ${additionalName}-${formattedDate} ).xlsx`;
}