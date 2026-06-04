import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

import "./crud_page.css";


function CrudPage({
    headers, 
    data,
    keyMapping, 
    onDelete, 
    onEdit, 
    onSave, 
    onCancel, 
    editingId, 
    editData, 
    onEditChange,
    fieldsTypes,
}){

    // Fonction qui retourne le bon champ selon le type
     const renderEditField = (key) => {
        const config = fieldsTypes?.[key];

        // Par défaut : input text si fieldTypes non défini
        if (!config || config.type === "input") {
        return (
            <input
            name={key}
            value={editData[key] ?? ""}
            onChange={onEditChange}
            type={config?.inputType || "text"}
            style={{
                width: "100%",
                padding: "4px 8px",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 6,
                fontSize: 13,
            }}
            />
        );
        }

        // Si c'est un select
        if (config.type === "select") {
        return (
            <select
            name={key}
            value={editData[key] ?? ""}
            onChange={onEditChange}
            style={{
                width: "100%",
                padding: "4px 8px",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 6,
                fontSize: 13,
            }}
            >
                <option value="">-- Choisir --</option>
                {config.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
        }
    };
    return<>
        <Table className="table table-striped table-hover table-bordered align-middle table_crud" >
            <TableHeader className="table-background">
                <TableRow>
                    {
                        headers.map((header, index)=>(
                            <TableHead key={index} className={`${header}`}>
                                {header}
                            </TableHead>
                        ))
                    }
                    <th className="table_setting">
                        Parametre
                    </th>
                    
                </TableRow>
            </TableHeader>
             <TableBody>
                 {
                     data.map((d, index) => {
                         const isEditing = editingId === (d.id ?? d.Id);
                         return (
                             <TableRow key={index}>
                                 {headers.map((header, i) => {
                                     const key = keyMapping[header] || header.toLowerCase();

                                     return (
                                         <TableCell key={i}>
                                            {
                                                isEditing ? renderEditField(key) : d[key] || ""
                                            }
                                         </TableCell>
                                        );
                                     })}
                                 <td style={{ display: "flex" }}>
                                     {isEditing ? (
                                         <>
                                             <button onClick={onSave} title="Sauvegarder">✅</button>
                                             <button onClick={onCancel} title="Annuler">🚫</button>
                                         </>
                                     ) : (
                                         <>
                                             <button 
                                                onClick={() => 
                                                    onEdit(d)}
                                            >💱</button>
                                             <button onClick={() => {
                                                 console.log("Objet complet:", d);
                                                 console.log("id:", d.id, "Id:", d.Id);
                                                 onDelete(d.id ?? d.Id);
                                             }}>
                                                 ❌
                                             </button>
                                         </>
                                     )}
                                 </td>
                             </TableRow>
                         );
                     })
                 }
             </TableBody>
        </Table>
    </>
}
                    
                    
                // </TableRow>
        //     </TableHeader>
        //     <TableBody>
        //         {
        //             data.map((d,index)=>(
        //                 <TableRow key={index}>
        //                     {
        //                         Object.values(d).map((value, i)=>(
        //                             <TableCell key={i}>
        //                                 {value}
        //                             </TableCell>
        //                         ))
        //                     }
        //                     {headers.map((header) => (
        //                         <td key={header.key}>{d[header.key]}</td>
        //                         // ↑ accède à ligne.matricule, ligne.nom, etc.
        //                     ))}
        //                 </TableRow> 
        //             ))
        //         }
                
        //     </TableBody>
        // </Table>
    // </>
// }


export default CrudPage;