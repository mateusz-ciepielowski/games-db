export async function Copyright() {
  "use cache";
  return <span>© {new Date().getFullYear()} GamesDB</span>;
}
