import React, { useState, useRef } from 'react';
import { Form, Button, Container, Card, Row, Col, Alert } from 'react-bootstrap';
import { PatternFormat } from 'react-number-format';
import { perguntasDTO } from './perguntasDTO';
import { supabase } from './supabaseClient';

const DTOForm = () => {
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedSubarea, setSelectedSubarea] = useState('');
  const [answers, setAnswers] = useState({});
  const [formData, setFormData] = useState({
    data: '',
    colaborador: '',
    supervisor: '',
    funcao: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dateInputRef = useRef(null);

  const handleAreaChange = (e) => {
    setSelectedArea(e.target.value);
    setSelectedSubarea('');
    setAnswers({}); // Reseta respostas ao mudar de área
  };

  const handleSubareaChange = (e) => {
    setSelectedSubarea(e.target.value);
    setAnswers({}); // Reseta respostas ao mudar de subárea
  };

  const handleAnswer = (questionIndex, answer) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  // Ajuste de scroll para mobile
  const handleDateFocus = () => {
    if (window.innerWidth <= 768 && dateInputRef.current) {
      setTimeout(() => {
        dateInputRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Validações
      const totalQuestions = perguntasDTO[selectedArea]?.[selectedSubarea]?.length || 0;
      if (Object.keys(answers).length !== totalQuestions) {
        throw new Error('Por favor, responda todas as perguntas antes de enviar.');
      }

      // 2. Tratamento de Data
      const rawDate = formData.data.replace(/\D/g, '');
      if (rawDate.length !== 8) {
        throw new Error('Data inválida. Preencha completamente DD/MM/AAAA');
      }

      const day = rawDate.slice(0, 2);
      const month = rawDate.slice(2, 4);
      const year = rawDate.slice(4, 8);
      const dataISO = `${year}-${month}-${day}`;
      
      const dateObject = new Date(dataISO);
      if (isNaN(dateObject.getTime())) {
        throw new Error('Data inválida.');
      }

      // 3. Formatação das Respostas
      const respostasMapeadas = {};
      Object.entries(answers).forEach(([key, value]) => {
        const numeroPergunta = parseInt(key) + 1;
        respostasMapeadas[`pergunta_${numeroPergunta}`] = value;
      });

      // 4. Envio ao Supabase
      const payload = {
        data: dataISO,
        supervisor: formData.supervisor,
        colaborador: formData.colaborador,
        funcao: formData.funcao,
        area: selectedArea,
        subarea: selectedSubarea,
        ...respostasMapeadas
      };

      const { error: supabaseError } = await supabase
        .from('dto_registros')
        .insert([payload]);

      if (supabaseError) throw supabaseError;

      // 5. Sucesso e Reset
      setFormData({ data: '', colaborador: '', supervisor: '', funcao: '' });
      setSelectedArea('');
      setSelectedSubarea('');
      setAnswers({});
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      let errorMessage = 'Erro no envio: ';
      if (err.message) errorMessage = err.message;
      if (err.code === '22008') errorMessage = 'Formato de data inválido no banco de dados.';
      if (err.code === '42501') errorMessage = 'Permissão negada. Verifique as políticas do Supabase.';
      
      setError(errorMessage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-4 px-3" fluid>
      
      {/* Alertas de Sucesso/Erro */}
      {showSuccess && (
        <Alert variant="success" className="mt-3" onClose={() => setShowSuccess(false)} dismissible>
          Formulário enviado com sucesso!
        </Alert>
      )}

      {error && (
        <Alert variant="danger" className="mt-3 sticky-top" style={{ top: '10px', zIndex: 1000 }}>
          <strong>Erro:</strong> {error}
        </Alert>
      )}

      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            
            {/* Dados do Colaborador */}
            <Row className="g-3 mb-4">
              <Col xs={12} md={3}>
                <Form.Group controlId="formData">
                  <Form.Label>Data</Form.Label>
                  <PatternFormat
                    format="##/##/####"
                    mask="_"
                    placeholder="DD/MM/AAAA"
                    value={formData.data}
                    onValueChange={({ value }) => {
                      setFormData({ ...formData, data: value });
                    }}
                    customInput={Form.Control}
                    type="tel"
                    inputMode="numeric"
                    onFocus={handleDateFocus}
                    getInputRef={dateInputRef} // Correção para react-number-format moderno
                    autoComplete="off"
                    required
                    className="mobile-date-input"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={3}>
                <Form.Group controlId="formSupervisor">
                  <Form.Label>Supervisor</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.supervisor}
                    onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={3}>
                <Form.Group controlId="formColaborador">
                  <Form.Label>Colaborador</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.colaborador}
                    onChange={(e) => setFormData({ ...formData, colaborador: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={3}>
                <Form.Group controlId="formFuncao">
                  <Form.Label>Função</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.funcao}
                    onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Seleção de Área */}
            <Row className="g-3 mb-4">
              <Col xs={12} md={6}>
                <Form.Group controlId="formArea">
                  <Form.Label>Área do DTO</Form.Label>
                  <Form.Select
                    value={selectedArea}
                    onChange={handleAreaChange}
                    required
                  >
                    <option value="">Selecione uma área</option>
                    {Object.keys(perguntasDTO).map(area => (
                      <option key={area} value={area}>
                        {area.charAt(0).toUpperCase() + area.slice(1)}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group controlId="formSubarea">
                  <Form.Label>Subárea do DTO</Form.Label>
                  <Form.Select
                    value={selectedSubarea}
                    onChange={handleSubareaChange}
                    disabled={!selectedArea}
                    required
                  >
                    <option value="">Selecione uma subárea</option>
                    {selectedArea && Object.keys(perguntasDTO[selectedArea]).map(subarea => (
                      <option key={subarea} value={subarea}>{subarea}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Checklist */}
            {selectedSubarea && (
              <Card className="mb-4 border-primary">
                <Card.Header className="bg-light py-2">
                  <h6 className="mb-0">Checklist: {selectedSubarea}</h6>
                </Card.Header>

                <Card.Body className="px-2 px-sm-3">
                  {perguntasDTO[selectedArea][selectedSubarea].map((pergunta, index) => (
                    <div key={index} className="mb-4 border-bottom pb-3">
                      <Form.Label className="d-block mb-2 fw-bold text-dark">
                        {index + 1}. {pergunta}
                      </Form.Label>

                      <div className="d-flex gap-2">
                        <Button
                          variant={answers[index] === 'OK' ? 'success' : 'outline-success'}
                          onClick={() => handleAnswer(index, 'OK')}
                          className="flex-grow-1"
                          style={{ minWidth: '80px' }}
                        >
                          OK
                        </Button>

                        <Button
                          variant={answers[index] === 'NOK' ? 'danger' : 'outline-danger'}
                          onClick={() => handleAnswer(index, 'NOK')}
                          className="flex-grow-1"
                          style={{ minWidth: '80px' }}
                        >
                          NOK
                        </Button>
                      </div>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            )}

            <div className="d-grid mt-4">
              <Button 
                variant="primary" 
                type="submit" 
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Formulário'}
              </Button>
            </div>

          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DTOForm;