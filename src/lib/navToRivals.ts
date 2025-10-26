export function resetToRivals(navigation: any){
  try{
    navigation?.reset?.({ index:0, routes:[{ name:'Tabs', params:{ screen:'Rivals' } }] });
  }catch(e){}
}
