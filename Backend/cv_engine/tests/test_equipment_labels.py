"""A complete registered name identifies the tool, not the selected production line."""
from src.adapters.equipment_snapshot import EquipmentSnapshot


def asset(key='lowering-1', **changes):
    return {'id': key, 'name': 'MC Lowering 1', 'code': '', 'aliases': [],
            'area': '17', **changes}


def test_complete_registered_name_is_not_discarded_for_a_different_selected_line():
    registry = EquipmentSnapshot([asset()])
    for text in ('MC Lowering 1', 'MC Lowering1', 'mc-lowering 1'):
        result = registry.match_label(text, area='1')
        assert result['suggested_id'] == 'lowering-1', result
        assert result['level'] == 'high' and not result['requires_operator_selection']


def test_cross_line_matching_never_guesses_partial_names_or_ambiguous_identities():
    registry = EquipmentSnapshot([asset()])
    for text in ('MC Lowering', 'MC Lowering 2', 'MC Lowering 10'):
        result = registry.match_label(text, area='1')
        assert result['suggested_id'] is None
    duplicate = EquipmentSnapshot([asset(), asset('lowering-copy', area='1')])
    assert duplicate.match_label('MC Lowering 1', area='1')['suggested_id'] is None


def test_legacy_code_without_name_evidence_stays_scoped_to_its_registered_line():
    registry = EquipmentSnapshot([asset(code='P-01')])
    assert registry.match_label('P-01', area='1')['suggested_id'] is None
    assert registry.match_label('P-01', area='17')['suggested_id'] == 'lowering-1'


def test_complete_registered_alias_can_identify_equipment_without_a_visible_code():
    registry = EquipmentSnapshot([asset(name='Lowering pressure fixture', aliases=['MC Lowering 1'])])
    result = registry.match_label('MC Lowering 1', area='1')
    assert result['suggested_id'] == 'lowering-1'
    assert result['candidates'][0]['evidence'] == 'alias'
