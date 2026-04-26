import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../models/site_summary.dart';
import '../providers/materials_provider.dart';
import '../providers/session_provider.dart';

class CreateMaterialScreen extends StatefulWidget {
  const CreateMaterialScreen({super.key, required this.sites});

  final List<SiteSummary> sites;

  @override
  State<CreateMaterialScreen> createState() => _CreateMaterialScreenState();
}

class _CreateMaterialScreenState extends State<CreateMaterialScreen> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _categoryController = TextEditingController();
  final _quantityController = TextEditingController(text: '1');
  final _latitudeController = TextEditingController();
  final _longitudeController = TextEditingController();
  final _picker = ImagePicker();
  final _conditions = const ['new', 'good', 'used', 'damaged'];
  File? _imageFile;
  String _condition = 'good';
  String? _siteId;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final firstSite = widget.sites.isNotEmpty ? widget.sites.first : null;
    _siteId = firstSite?.id;
    _latitudeController.text = firstSite?.latitude.toString() ?? '';
    _longitudeController.text = firstSite?.longitude.toString() ?? '';
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _categoryController.dispose();
    _quantityController.dispose();
    _latitudeController.dispose();
    _longitudeController.dispose();
    super.dispose();
  }

  Future<void> _openCamera() async {
    final image = await _picker.pickImage(source: ImageSource.camera, imageQuality: 78, maxWidth: 1600);
    if (image == null) {
      return;
    }
    setState(() {
      _imageFile = File(image.path);
    });
  }

  Future<void> _openGallery() async {
    final image = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 78, maxWidth: 1600);
    if (image == null) {
      return;
    }
    setState(() {
      _imageFile = File(image.path);
    });
  }

  Future<void> _submit() async {
    final session = context.read<SessionProvider>().session!;
    final materialsProvider = context.read<MaterialsProvider>();
    if (_imageFile == null || _siteId == null) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      await materialsProvider.createMaterial(
        session: session,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        category: _categoryController.text.trim(),
        quantity: double.tryParse(_quantityController.text) ?? 1,
        condition: _condition,
        siteId: _siteId!,
        latitude: double.tryParse(_latitudeController.text) ?? 0,
        longitude: double.tryParse(_longitudeController.text) ?? 0,
        imageFile: _imageFile!,
      );
      if (context.mounted) {
        Navigator.of(context).pop();
      }
    } finally {
      setState(() {
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Material erstellen')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'In unter 10 Sekunden teilen',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(color: const Color(0xFF91A0B8)),
          ),
          const SizedBox(height: 12),
          if (_imageFile != null)
            Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Image.file(_imageFile!, height: 240, width: double.infinity, fit: BoxFit.cover),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _openCamera,
                        icon: const Icon(Icons.camera_alt_outlined),
                        label: const Text('Neu fotografieren'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _openGallery,
                        icon: const Icon(Icons.photo_library_outlined),
                        label: const Text('Aus Galerie'),
                      ),
                    ),
                  ],
                ),
              ],
            )
          else
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF131A24),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF253042)),
              ),
              child: Column(
                children: [
                  const Icon(Icons.add_a_photo_outlined, color: Color(0xFFF5BF18), size: 34),
                  const SizedBox(height: 12),
                  const Text('Bild fur neues Material hinzufugen'),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _openCamera,
                          icon: const Icon(Icons.camera_alt_outlined),
                          label: const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12),
                            child: Text('Kamera'),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _openGallery,
                          icon: const Icon(Icons.photo_library_outlined),
                          label: const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12),
                            child: Text('Galerie'),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          const SizedBox(height: 16),
          TextField(controller: _titleController, decoration: const InputDecoration(labelText: 'Titel')),
          const SizedBox(height: 12),
          TextField(
            controller: _descriptionController,
            decoration: const InputDecoration(labelText: 'Beschreibung'),
            maxLines: 4,
          ),
          const SizedBox(height: 12),
          TextField(controller: _categoryController, decoration: const InputDecoration(labelText: 'Kategorie (optional)')),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _condition,
            items: _conditions.map((condition) => DropdownMenuItem(value: condition, child: Text(condition))).toList(),
            onChanged: (value) => setState(() => _condition = value ?? 'good'),
            decoration: const InputDecoration(labelText: 'Zustand'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _quantityController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Menge'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _siteId,
            items: widget.sites
                .map((site) => DropdownMenuItem<String>(value: site.id, child: Text(site.name)))
                .toList(),
            onChanged: (value) {
              if (value == null) {
                return;
              }
              final selectedSite = widget.sites.firstWhere((site) => site.id == value);
              setState(() {
                _siteId = value;
                _latitudeController.text = selectedSite.latitude.toString();
                _longitudeController.text = selectedSite.longitude.toString();
              });
            },
            decoration: const InputDecoration(labelText: 'Baustelle'),
          ),
          const SizedBox(height: 12),
          TextField(controller: _latitudeController, decoration: const InputDecoration(labelText: 'Breitengrad')),
          const SizedBox(height: 12),
          TextField(controller: _longitudeController, decoration: const InputDecoration(labelText: 'Langengrad')),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _isSubmitting ? null : _submit,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Text(_isSubmitting ? 'Wird hochgeladen...' : 'Sofort teilen'),
            ),
          ),
        ],
      ),
    );
  }
}
