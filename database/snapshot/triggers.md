# Triggers

| table_name | trigger_name | action_timing | event_manipulation | action_orientation | action_statement |
| --- | --- | --- | --- | --- | --- |
| medicine | medicine_search_vector_trigger | BEFORE | INSERT | ROW | EXECUTE FUNCTION medicine_search_vector_update() |
| medicine | medicine_search_vector_trigger | BEFORE | UPDATE | ROW | EXECUTE FUNCTION medicine_search_vector_update() |
| medicine_purchase_detail | tg_purchase_detail_to_txn | AFTER | DELETE | ROW | EXECUTE FUNCTION fn_tg_purchase_detail_to_txn() |
| medicine_purchase_detail | tg_purchase_detail_to_txn | AFTER | INSERT | ROW | EXECUTE FUNCTION fn_tg_purchase_detail_to_txn() |
| medicine_purchase_detail | tg_purchase_detail_to_txn | AFTER | UPDATE | ROW | EXECUTE FUNCTION fn_tg_purchase_detail_to_txn() |
| medicine_transaction | tg_stockquantity_generic | AFTER | DELETE | ROW | EXECUTE FUNCTION fn_tg_stockquantity_generic() |
| medicine_transaction | tg_stockquantity_generic | AFTER | INSERT | ROW | EXECUTE FUNCTION fn_tg_stockquantity_generic() |
| medicine_transaction | tg_stockquantity_generic | AFTER | UPDATE | ROW | EXECUTE FUNCTION fn_tg_stockquantity_generic() |
| pharmacy_sale_detail | tg_sale_detail_to_txn | AFTER | DELETE | ROW | EXECUTE FUNCTION fn_tg_sale_detail_to_txn() |
| pharmacy_sale_detail | tg_sale_detail_to_txn | AFTER | INSERT | ROW | EXECUTE FUNCTION fn_tg_sale_detail_to_txn() |
| pharmacy_sale_detail | tg_sale_detail_to_txn | AFTER | UPDATE | ROW | EXECUTE FUNCTION fn_tg_sale_detail_to_txn() |
| purchase_return_detail | tg_purchase_return_detail_to_txn | AFTER | DELETE | ROW | EXECUTE FUNCTION fn_tg_purchase_return_detail_to_txn() |
| purchase_return_detail | tg_purchase_return_detail_to_txn | AFTER | INSERT | ROW | EXECUTE FUNCTION fn_tg_purchase_return_detail_to_txn() |
| purchase_return_detail | tg_purchase_return_detail_to_txn | AFTER | UPDATE | ROW | EXECUTE FUNCTION fn_tg_purchase_return_detail_to_txn() |
| sale_return_detail | tg_sale_return_detail_to_txn | AFTER | DELETE | ROW | EXECUTE FUNCTION fn_tg_sale_return_detail_to_txn() |
| sale_return_detail | tg_sale_return_detail_to_txn | AFTER | INSERT | ROW | EXECUTE FUNCTION fn_tg_sale_return_detail_to_txn() |
| sale_return_detail | tg_sale_return_detail_to_txn | AFTER | UPDATE | ROW | EXECUTE FUNCTION fn_tg_sale_return_detail_to_txn() |
