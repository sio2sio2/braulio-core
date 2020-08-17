/**
 * Añade el dominio al nombre de cuenta en caso de que sea necesario.
 */
export function fqda(address) {
   const domain = gapi.auth2.getAuthInstance().currentUser.get().getHostedDomain();
   return (address.includes('@')?address:`${address}@${domain}`).toLowerCase();
}

export function fallback(error) {
   console.error(error);
   throw new Error("thenable son función de fallback");
}
