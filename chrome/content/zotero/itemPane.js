/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2009 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org
    
    This file is part of Zotero.
    
    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
    
    ***** END LICENSE BLOCK *****
*/

var ZoteroItemPane = new function() {
	var _container;
	var _header, _sidenav, _scrollParent, _itemBox, _abstractBox, _tagsBox, _notesBox, _relatedBox, _boxes;
	var _deck;
	var _lastItem;
	var _selectedNoteID;
	var _translationTarget;

	this.onLoad = function () {
		if (!Zotero) {
			return;
		}
		
		_container = document.getElementById('zotero-view-item-container');
		_header = document.getElementById('zotero-item-pane-header');
		_sidenav = document.getElementById('zotero-view-item-sidenav');
		_scrollParent = document.getElementById('zotero-view-item');
		_itemBox = document.getElementById('zotero-editpane-item-box');
		_abstractBox = document.getElementById('zotero-editpane-abstract');
		_notesBox = document.getElementById('zotero-editpane-notes');
		_tagsBox = document.getElementById('zotero-editpane-tags');
		_relatedBox = document.getElementById('zotero-editpane-related');
		_boxes = [_itemBox, _abstractBox, _notesBox, _tagsBox, _relatedBox];
		
		_deck = document.getElementById('zotero-item-pane-content');
		
		this._unregisterID = Zotero.Notifier.registerObserver(this, ['item'], 'itemPane');
	}
	
	
	this.onUnload = function () {
		Zotero.Notifier.unregisterObserver(this._unregisterID);
	},
	
	
	/*
	 * Load a top-level item
	 */
	this.viewItem = Zotero.Promise.coroutine(function* (item, mode, pane) {
		if (!pane) {
			pane = 'info';
		}
		
		Zotero.debug('Viewing item in pane ' + pane);

		_notesBox.parentItem = item;
		
		_lastItem = item;

		_container.classList.toggle('feed-item', !!item.isFeedItem);
		if (item.isFeedItem) {
			let lastTranslationTarget = Zotero.Prefs.get('feeds.lastTranslationTarget');
			if (lastTranslationTarget) {
				let id = parseInt(lastTranslationTarget.substr(1));
				if (lastTranslationTarget[0] == "L") {
					_translationTarget = Zotero.Libraries.get(id);
				}
				else if (lastTranslationTarget[0] == "C") {
					_translationTarget = Zotero.Collections.get(id);
				}
			}
			if (!_translationTarget) {
				_translationTarget = Zotero.Libraries.userLibrary;
			}
			this.setTranslateButton();
		}
		
		for (let box of [_header, ..._boxes]) {
			if (mode) {
				box.mode = mode;
				
				if (box.mode == 'view') {
					box.hideEmptyFields = true;
				}
			}
			else {
				box.mode = 'edit';
			}
			
			box.item = item;
		}
		
		_sidenav.selectedPane = pane;
		_sidenav.scrollToPane(pane, 'instant');
	});
	
	
	this.notify = Zotero.Promise.coroutine(function* (action, type, ids, extraData) {
		if (action == 'refresh' && _lastItem) {
			yield this.viewItem(_lastItem, null, 0);
		}
	});
	
	
	this.blurOpenField = async function () {
		if (_itemBox.contains(document.activeElement)) {
			await _itemBox.blurOpenField();
		}
		else if (_header.contains(document.activeElement)) {
			await _header.blurOpenField();
		}
		_scrollParent.focus();
	};
	
	
	this.onNoteSelected = function (item, editable) {
		_selectedNoteID = item.id;
		
		var noteEditor = document.getElementById('zotero-note-editor');
		noteEditor.mode = editable ? 'edit' : 'view';
		noteEditor.viewMode = 'library';
		noteEditor.parent = null;
		noteEditor.item = item;
		
		document.getElementById('zotero-item-pane-content').selectedIndex = 2;
	};
	
	
	/**
	 * Select the parent item and open the note editor
	 */
	this.openNoteWindow = async function () {
		var selectedNote = Zotero.Items.get(_selectedNoteID);
		ZoteroPane.openNoteWindow(selectedNote.id);
	};
	
	
	this.translateSelectedItems = Zotero.Promise.coroutine(function* () {
		var collectionID = _translationTarget.objectType == 'collection' ? _translationTarget.id : undefined;
		var items = ZoteroPane_Local.itemsView.getSelectedItems();
		for (let item of items) {
			yield item.translate(_translationTarget.libraryID, collectionID);
		}
	});
	
	
	this.buildTranslateSelectContextMenu = function (event) {
		var menu = document.getElementById('zotero-item-addTo-menu');
		// Don't trigger rebuilding on nested popupmenu open/close
		if (event.target != menu) {
			return;
		}
		// Clear previous items
		while (menu.firstChild) {
			menu.removeChild(menu.firstChild);
		}
		
		let target = Zotero.Prefs.get('feeds.lastTranslationTarget');
		if (!target) {
			target = "L" + Zotero.Libraries.userLibraryID;
		}
		
		var libraries = Zotero.Libraries.getAll();
		for (let library of libraries) {
			if (!library.editable || library.libraryType == 'publications') {
				continue;
			}
			Zotero.Utilities.Internal.createMenuForTarget(
				library,
				menu,
				target,
				function(event, libraryOrCollection) {
					if (event.target.tagName == 'menu') {
						Zotero.Promise.coroutine(function* () {
							// Simulate menuitem flash on OS X
							if (Zotero.isMac) {
								event.target.setAttribute('_moz-menuactive', false);
								yield Zotero.Promise.delay(50);
								event.target.setAttribute('_moz-menuactive', true);
								yield Zotero.Promise.delay(50);
								event.target.setAttribute('_moz-menuactive', false);
								yield Zotero.Promise.delay(50);
								event.target.setAttribute('_moz-menuactive', true);
							}
							menu.hidePopup();
							
							ZoteroItemPane.setTranslationTarget(libraryOrCollection);
							event.stopPropagation();
						})();
					}
					else {
						ZoteroItemPane.setTranslationTarget(libraryOrCollection);
						event.stopPropagation();
					}
				}
			);
		}
	};
	
	
	this.setTranslateButton = function() {
		var label = Zotero.getString('pane.item.addTo', _translationTarget.name);
		var elem = document.getElementById('zotero-feed-item-addTo-button');
		elem.label = label;

		var key = Zotero.Keys.getKeyForCommand('saveToZotero');
		
		var tooltip = label 
			+ (Zotero.rtl ? ' \u202B' : ' ') + '(' 
			+ (Zotero.isMac ? '⇧⌘' : Zotero.getString('general.keys.ctrlShift'))
			+ key + ')';
		elem.title = tooltip;
		elem.image = _translationTarget.treeViewImage;
	};
	

	this.setTranslationTarget = function(translationTarget) {
		_translationTarget = translationTarget;
		Zotero.Prefs.set('feeds.lastTranslationTarget', translationTarget.treeViewID);
		ZoteroItemPane.setTranslateButton();
	};
	
	
	this.setReadLabel = function (isRead) {
		var elem = document.getElementById('zotero-feed-item-toggleRead-button');
		var label = Zotero.getString('pane.item.' + (isRead ? 'markAsUnread' : 'markAsRead'));
		elem.textContent = label;

		var key = Zotero.Keys.getKeyForCommand('toggleRead');
		var tooltip = label + (Zotero.rtl ? ' \u202B' : ' ') + '(' + key + ')'
		elem.title = tooltip;
	};
	
	
	this.getSidenavSelectedPane = function () {
		return _sidenav.selectedPane;
	};
};

addEventListener("load", function(e) { ZoteroItemPane.onLoad(e); }, false);
addEventListener("unload", function(e) { ZoteroItemPane.onUnload(e); }, false);
