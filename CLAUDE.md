# CLAUDE.md

Les conventions de code et les commandes du projet sont dans [AGENTS.md](AGENTS.md).

## Surveillance & tâches planifiées
- **Jamais de sa propre initiative** : ne pas s'abonner aux événements d'une PR (`subscribe_pr_activity`), ne pas planifier de réveil/check-in (`send_later`, `ScheduleWakeup`, routines/triggers, cron, `watch_url`), ne pas lancer de boucle de polling en tâche de fond. Ça vaut aussi juste après avoir ouvert une PR. Ne pas le proposer non plus.
- **Uniquement sur demande explicite.** Dans ce cas : annoncer la cadence et la condition d'arrêt ; arrêter dès que je le dis ou que l'objet suivi est clos (PR mergée/fermée, run terminé) ; si rien ne change sur plusieurs passages consécutifs, arrêter et me le dire plutôt que de réarmer indéfiniment.
